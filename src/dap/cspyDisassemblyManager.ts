/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import Int64 = require("node-int64");
import { DebugProtocol } from "@vscode/debugprotocol";
import * as Disassembly from "iar-vsc-common/thrift/bindings/Disassembly";
import * as SourceLookup from "iar-vsc-common/thrift/bindings/SourceLookup";
import { DISASSEMBLY_SERVICE } from "iar-vsc-common/thrift/bindings/disassembly_types";
import { ContextRef, ContextType, Location, Zone } from "iar-vsc-common/thrift/bindings/shared_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { SOURCE_LOOKUP_SERVICE } from "iar-vsc-common/thrift/bindings/sourcelookup_types";
import { Source } from "@vscode/debugadapter";
import { Disposable } from "./disposable";
import { basename } from "path";
import { logger } from "@vscode/debugadapter/lib/logger";

/**
 * Requests disassembly from cspyserver and converts it to a dap-friendly format.
 *
 * The base unit for dap disassembly is lines (i.e. it requests X lines), whereas cspy
 * only deals with addresses. We can't really know how much memory to disassemble to generate
 * a certain number of lines, so we simply guess and fetch more if it wasn't enough.
 *
 * No (mutable) state is carried here, so it might be better to make
 * this a namespace of pure functions.
 */
export class CspyDisassemblyManager implements Disposable {
    static async instantiate(serviceMgr: ThriftServiceManager,
        clientLinesStartAt1: boolean,
        clientColumnsStartAt1: boolean,
    ): Promise<CspyDisassemblyManager> {
        return new CspyDisassemblyManager(
            await serviceMgr.findService(DISASSEMBLY_SERVICE, Disassembly.Client),
            await serviceMgr.findService(SOURCE_LOOKUP_SERVICE, SourceLookup.Client),
            clientLinesStartAt1,
            clientColumnsStartAt1,
        );
    }

    // We don't know the instruction size, so guess and use that to decide how much memory to disassemble.
    // ! If you lower this, make sure the addresses you pass to disassembleRange are word-aligned
    private readonly guessedInstructionSize = 4;

    constructor(private readonly disasm: ThriftClient<Disassembly.Client>,
                private readonly sourceLookup: ThriftClient<SourceLookup.Client>,
                private readonly clientLinesStartAt1: boolean,
                private readonly clientColumnsStartAt1: boolean) { }

    dispose() {
        this.disasm.close();
        this.sourceLookup.close();
    }

    /**
     * Fetches lines of disassembly and returns the in dap format. There may be multiple
     * {@link DebugProtocol.DisassembledInstruction} generated per actual instruction (see {@link fetchDisassemblyRange}).
     * @param memoryReference The base memory address as a hex string to start disassembling from
     * @param lineCount The number of lines to return. The number of actual instructions may be less than this.
     * @param offset An offset to apply to the base memory address
     * @param lineOffset An offset (in lines) to apply to the offset memory address
     * @returns
     */
    async fetchDisassembly(memoryReference: string, lineCount: number, offset?: number, lineOffset?: number): Promise<DebugProtocol.DisassembledInstruction[]> {
        // Gives the default code zone. Matches eclipse's behaviour.
        const zone = new Zone({id: -1});

        const baseAddress = add(new Int64(memoryReference), offset ?? 0);

        // How many lines to generate before the base address (exclusive), and after it (inclusive)
        let linesBackward = -(lineOffset ?? 0);
        let linesForward = lineCount - linesBackward;

        // Fetch chuncks backwards from the base addr until we have enough
        let before: DebugProtocol.DisassembledInstruction[] = [];
        {
            let currentEndAddr = baseAddress;
            while (linesBackward > 0) {
                let startAddr = add(currentEndAddr, -linesBackward*this.guessedInstructionSize);
                if (lessThan(currentEndAddr, startAddr)) { // We underflowed, use 0
                    startAddr = new Int64(0);
                }
                logger.verbose(`Fetching ${startAddr.toOctetString()}-${currentEndAddr.toOctetString()}`);
                let fetched = await this.fetchDisassemblyRange(startAddr, currentEndAddr, zone);
                if (fetched.length > linesBackward) {
                    fetched = fetched.slice(fetched.length - linesBackward, fetched.length);
                } else if (fetched.length === 0) {
                    linesBackward = 0; // We hit the end of the zone
                }
                before = fetched.concat(before);
                linesBackward -= fetched.length;
                currentEndAddr = startAddr;
            }
        }

        // Fetch chuncks forwards from the base addr until we have enough
        let after: DebugProtocol.DisassembledInstruction[] = [];
        {
            let currentStartAddr = baseAddress;
            while (linesForward > 0) {
                let endAddr = add(currentStartAddr, linesForward*this.guessedInstructionSize);
                if (lessThan(endAddr, currentStartAddr)) { // We overflowed, use max 64-bit value
                    endAddr = new Int64(Buffer.alloc(8, 0xff));
                }
                logger.verbose(`Fetching ${currentStartAddr.toOctetString()}-${endAddr.toOctetString()}`);
                let fetched = await this.fetchDisassemblyRange(currentStartAddr, endAddr, zone);
                fetched = fetched.slice(0, linesForward);
                if (fetched.length === 0) {
                    linesForward = 0; // We hit the end of the zone
                }
                after = after.concat(fetched);
                linesForward -= fetched.length;
                currentStartAddr = endAddr;
            }
        }

        const result = before.concat(after);
        await this.populateSourceInfo(result, zone);
        return result;
    }

    // Fetches disassembly from cspy and converts it to dap disasm lines.
    private async fetchDisassemblyRange(start: Int64, end: Int64, zone: Zone): Promise<DebugProtocol.DisassembledInstruction[]> {
        const startLocation = new Location({
            zone: zone,
            address: start
        });
        const endLocation = new Location({
            zone: zone,
            address: end
        });
        const targetContext = new ContextRef({core: 0, level: 0, task: 0, type: ContextType.Target});
        const disasmLocations = await this.disasm.service.disassembleRange(startLocation, endLocation,
            targetContext);

        return disasmLocations.
            flatMap(dloc => {
                // Map cspy instructions to dap format. Note that vs code does not support newline in instructions, so we have to
                // map such cspy instructions to *multiple* dap instructions at the same address. Hence the flatMap.
                const dapInstrs = dloc.instructions.flatMap(instr => {
                    const addressStr = "0x" + dloc.location.address.toOctetString();
                    // Picks out all interesting parts of a disasm instruction. Adapted from the corresponding eclipse code.
                    // label(s) (group #1), address (group #4), opcodes (group #5), instruction (group #7)
                    const instrMatch = instr.match(/(((.+):\n)*)\s*([\w|']+):\s+((0x[\w|']+\s+)*)([\s\S]*)/m);
                    if (instrMatch === null || instrMatch[7] === undefined) {
                        logger.error("Failed to parse instruction: " + instr);
                        return [{
                            instruction: instr,
                            address: addressStr,
                        }];
                    }
                    try {
                        // Skip instruction if address is invalid (eclipse does this)
                        BigInt(instrMatch[4]?.replace("'", "") ?? "error");
                    } catch {
                        return [];
                    }

                    // Place each label on its own line
                    const labels = instrMatch[1]?.split(":\n").filter(label => label !== "") ?? [];
                    const labelsDi: DebugProtocol.DisassembledInstruction[] = labels.map(label => {
                        label = label.trim();
                        return {
                            instruction: "\t\t" + label + ":",
                            address: addressStr,
                            symbol: label,
                        };
                    });

                    // The actual instruction
                    const di: DebugProtocol.DisassembledInstruction = {
                        instruction: instrMatch[7],
                        address: addressStr,
                        instructionBytes: instrMatch[5]?.trim()
                    };

                    // Some instructions have multiline comments (ECL-2558), which we need to give their own line
                    const extraLines = instrMatch[7].split("\n").slice(1);
                    const extraDi: DebugProtocol.DisassembledInstruction[] = extraLines.map(line => {
                        return { instruction: line, address: addressStr };
                    });

                    return (labelsDi ?? []).concat([di]).concat(extraDi);
                });

                return dapInstrs;
            });
    }

    // Looks up the corresponding source lines of the instructions, and adds that information
    private async populateSourceInfo(instructions: DebugProtocol.DisassembledInstruction[], zone: Zone): Promise<void> {
        let lastFile: string | undefined = undefined;
        let lastLine = -1;
        let i = -1;
        // We could do a lot of this concurrently for a minor performance increase, but some extra complexity
        for (const instruction of instructions) {
            i++;
            // Only do source lookup for the first line with a given address
            if (instructions[i-1]?.address === instruction.address) continue;

            const location = new Location({ zone: zone, address: new Int64(instruction.address) });
            try {
                const ranges = await this.sourceLookup.service.getSourceRanges(location);
                const range = ranges[0];
                if (range) {
                    // Only the first instruction for a line should be decorated
                    if (range.filename !== lastFile || range.first.line !== lastLine) {
                        lastFile = range.filename;
                        lastLine = range.first.line;
                        instruction.location = new Source(basename(range.filename), range.filename);
                        instruction.line = this.convertDebuggerLineToClient(range.first.line);
                        instruction.column = this.convertDebuggerColumnToClient(range.first.col);
                        instruction.endLine = this.convertDebuggerLineToClient(range.last.line);
                        instruction.endColumn = this.convertDebuggerColumnToClient(range.last.col);
                    }
                }
                if (ranges.length > 1) {
                    logger.error("Got multiple source ranges for line: " + instruction.instruction);
                }
            } catch {}
        }
    }

    private convertDebuggerLineToClient(line: number): number {
        return this.clientLinesStartAt1 ? line : line - 1;
    }

    private convertDebuggerColumnToClient(column: number): number {
        return this.clientColumnsStartAt1 ? column : column - 1;
    }
}

/**
 * Adds a number to a 64-bit integer and returns the result. On over/underflow, clamps the result to the valid range.
 */
function add(a: Int64, b: number): Int64 {
    // BigInt supercedes Int64 and supports arithmetic. However, we're stuck with Int64 since that's what thrift uses
    const bigA = BigInt("0x"+a.toOctetString());
    const bigB = BigInt(b);
    let result = bigA + bigB;
    if (result < 0n) {
        result = 0n;
    } else if (result > 2n ** 64n - 1n) {
        result = 2n ** 64n - 1n;
    }
    return new Int64(result.toString(16));
}

/**
 * Is a less than b?
 */
function lessThan(a: Int64, b: Int64): boolean {
    // BigInt supercedes Int64 and supports arithmetic. However, we're stuck with Int64 since that's what thrift uses
    return BigInt("0x"+a.toOctetString()) < BigInt("0x"+b.toOctetString());
}
