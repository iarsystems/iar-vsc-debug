import Int64 = require("node-int64");
import { DebugProtocol } from "vscode-debugprotocol";
import * as Disassembly from "./thrift/bindings/Disassembly";
import { DISASSEMBLY_SERVICE } from "./thrift/bindings/disassembly_types";
import { ContextRef, ContextType, Location, Zone } from "./thrift/bindings/shared_types";
import { ThriftClient } from "./thrift/thriftClient";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";

/**
 * Requests disassembly from cspyserver and converts it to a dap-friendly format.
 *
 * The base unit for dap disassembly is lines (i.e. it requests X lines), whereas cspy
 * only deals with addresses. We can't really know how much memory to disassemble to generate
 * a certain number of lines, so we simply guess and fetch more if it wasn't enough.
 */
export class CspyDisassemblyManager {
    static async instantiate(serviceMgr: ThriftServiceManager): Promise<CspyDisassemblyManager> {
        return new CspyDisassemblyManager(
            await serviceMgr.findService(DISASSEMBLY_SERVICE, Disassembly.Client),
        );
    }

    // We don't know the instruction size, so guess and use that to decide how much memory to disassemble.
    // ! If you lower this, make sure the addresses you pass to disassembleRange are word-aligned
    private readonly guessedInstructionSize = 4;

    constructor(private readonly disasm: ThriftClient<Disassembly.Client>) { }

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
        // const zoneInfo = await this.dbgr.service.getZoneById(zone.id);

        const baseAddress = add(new Int64(memoryReference), new Int64(offset ?? 0));

        // How many lines to generate before the base address (exclusive), and after it (inclusive)
        let linesBackward = -(lineOffset ?? 0);
        let linesForward = lineCount - linesBackward;

        // Fetch chuncks backwards from the base addr until we have enough
        let before: DebugProtocol.DisassembledInstruction[] = [];
        {
            let currentEndAddr = baseAddress;
            while (linesBackward > 0) {
                let startAddr = add(currentEndAddr, new Int64(-linesBackward*this.guessedInstructionSize));
                if (lessThan(currentEndAddr, startAddr)) { // We underflowed, use 0
                    startAddr = new Int64(0);
                }
                console.log(`Fetching ${startAddr.toOctetString()}-${currentEndAddr.toOctetString()}`);
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
                let endAddr = add(currentStartAddr, new Int64(linesForward*this.guessedInstructionSize));
                if (lessThan(endAddr, currentStartAddr)) { // We overflowed, use max 64-bit value
                    endAddr = new Int64(Buffer.alloc(8, 0xff));
                }
                console.log(`Fetching ${currentStartAddr.toOctetString()}-${endAddr.toOctetString()}`);
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

        return before.concat(after);
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
                        console.error("Failed to parse instruction: " + instr);
                        return [{
                            instruction: instr,
                            address: addressStr,
                        }];
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
                        instructionBytes: instrMatch[5]
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
}

/**
 * Adds two 64-bit integers and returns the result.
 */
function add(a: Int64, b: Int64): Int64 {
    // BigInt supercedes Int64 and supports arithmetic. However, we're stuck with Int64 since that's what thrift uses
    const result = BigInt("0x"+a.toOctetString()) + BigInt("0x"+b.toOctetString());
    return new Int64(result.toString(16));
}

/**
 * Is a less than b?
 */
function lessThan(a: Int64, b: Int64): boolean {
    // BigInt supercedes Int64 and supports arithmetic. However, we're stuck with Int64 since that's what thrift uses
    return BigInt("0x"+a.toOctetString()) < BigInt("0x"+b.toOctetString());
}
