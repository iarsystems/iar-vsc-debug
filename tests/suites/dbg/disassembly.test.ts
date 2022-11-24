/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import thrift = require("thrift");
import Int64 = require("node-int64");
import * as Assert from "assert";
import Q = thrift.Q;
import * as Disassembly from "iar-vsc-common/thrift/bindings/Disassembly";
import * as SourceLookup from "iar-vsc-common/thrift/bindings/SourceLookup";
import { CspyDisassemblyService } from "../../../src/dap/cspyDisassemblyService";
import { ContextRef, Location, SourceLocation, SourceRange } from "iar-vsc-common/thrift/bindings/shared_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { DisassembledLocation } from "iar-vsc-common/thrift/bindings/disassembly_types";
import EventEmitter = require("events");
import { Source } from "@vscode/debugadapter";
import { OsUtils } from "iar-vsc-common/osUtils";
import { debugAdapterSuite } from "./debugAdapterSuite";
import { DebugProtocol } from "@vscode/debugprotocol";

/**
 * Uses mock disassembly and source lookup services to test disassembly requests.
 * This lets us test it in a way that doesn't rely on the target having a specific memory layout,
 * so that it works on any device.
 */
suite("Disassembly with mock service", () =>{
    let disasm: CspyDisassemblyService;
    let instruction = `0x${"f".repeat(16)}: 0x${"f".repeat(16)}: BL main`;
    let sourceRange: SourceRange | undefined;

    suiteSetup(() => {
        const mockClient: Disassembly.Client = {
            disassembleRange: (from: Location, to: Location, _context: ContextRef): Q.Promise<DisassembledLocation[]> => {
                const fromAddr = BigInt("0x" + from.address.toOctetString());
                const toAddr = BigInt("0x" + to.address.toOctetString());
                Assert(fromAddr <= toAddr);
                const result = [...new Array(Number(toAddr - fromAddr) / 4)].map((_, i) => {
                    return new DisassembledLocation({
                        instructions: [instruction],
                        _function: " ", // not used
                        location: new Location({ zone: from.zone, address: new Int64((fromAddr + BigInt(i*4)).toString(16))}),
                        offset: new Int64(0)
                    });
                });
                return Q.resolve(result);
            }
        } as Disassembly.Client;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const disasmClient = new ThriftClient<Disassembly.Client>(new EventEmitter(), mockClient);

        const mockSourceClient: SourceLookup.Client = {
            getSourceRanges: (_location: Location): Q.Promise<SourceRange[]> => {
                return Q.resolve(sourceRange ? [sourceRange] : []);
            }
        } as SourceLookup.Client;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const sourceClient = new ThriftClient<SourceLookup.Client>(new EventEmitter(), mockSourceClient);

        disasm = new CspyDisassemblyService(disasmClient, sourceClient, true, true);
    });

    test("Handles invalid memory ranges", async() => {
        let lines = await disasm.fetchDisassembly("0x0", 50, undefined, -50);
        Assert.deepStrictEqual(lines, []);
        lines = await disasm.fetchDisassembly("0x0", 50, undefined, -25);
        Assert.strictEqual(lines.length, 25);

        lines = await disasm.fetchDisassembly("0x" + "f".repeat(16), 50, undefined, 0);
        Assert.deepStrictEqual(lines, []);

        lines = await disasm.fetchDisassembly("0x" + "f".repeat(16), 50, undefined, 10);
        Assert.deepStrictEqual(lines, []);

        lines = await disasm.fetchDisassembly("0x" + "f".repeat(16), 50, 8, undefined);
        Assert.deepStrictEqual(lines, []);
    });

    test("Parses labels", async() => {
        sourceRange = undefined;
        const address = "0x000000000000beef";
        instruction = "Abort_Handler:\n"+
            "Prefetch_Handler:\n"+
            "SWI_Handler... +2 symbols not displayed:\n"+
            "0xbeef: 0xeaff 0xfffe     B         Abort_Handler           ; 0x184 ()";
        const lines = await disasm.fetchDisassembly(address, 4, undefined, undefined);
        Assert.deepStrictEqual(lines[0], {
            address: address,
            instruction: "\t\tAbort_Handler:",
            symbol:  "Abort_Handler",
        });
        Assert.deepStrictEqual(lines[1], {
            address: address,
            instruction: "\t\tPrefetch_Handler:",
            symbol:  "Prefetch_Handler",
        });
        Assert.deepStrictEqual(lines[2], {
            address: address,
            instruction: "\t\tSWI_Handler... +2 symbols not displayed:",
            symbol:  "SWI_Handler... +2 symbols not displayed",
        });
        Assert.deepStrictEqual(lines[3], {
            address: address,
            instruction: "B         Abort_Handler           ; 0x184 ()",
            instructionBytes:  "0xeaff 0xfffe",
        });
    });

    test("Handles high addresses", async() => {
        sourceRange = undefined;
        instruction = "0xdead'beef: 0xeafffffe     B         Abort_Handler           ; 0x184 ()";
        const lines = await disasm.fetchDisassembly("0x" + "f".repeat(16), 1, 0, -1);
        Assert.deepStrictEqual(lines, [{
            instruction: "B         Abort_Handler           ; 0x184 ()",
            address: "0xfffffffffffffffb",
            instructionBytes: "0xeafffffe"
        }]);
    });

    test("Ignores invalid addresses", async() => {
        sourceRange = undefined;
        instruction = "        0xANINVALIDADDRESS: ----           ---";
        const lines = await disasm.fetchDisassembly("0xbeef", 1, 0, 0);
        Assert.deepStrictEqual(lines, []);
    });

    test("Returns unmatched lines", async() => {
        sourceRange = undefined;
        instruction = "!!!A REALLY WEIRD ASM LINE!!!";
        const lines = await disasm.fetchDisassembly("0xbeef", 1, 0, 0);
        Assert.deepStrictEqual(lines, [{
            instruction: instruction,
            address: "0x000000000000beef"
        }]);
    });

    test("Provides source", async() => {
        const filename = (OsUtils.detectOsType() === OsUtils.OsType.Windows) ? "C:\\myfile.c" : "/test/myfile.c";
        sourceRange = new SourceRange({
            filename: filename,
            text: " ", // not used
            first: new SourceLocation({
                filename: filename,
                col: 0,
                line: 15,
                locations: [],
            }),
            last: new SourceLocation({
                filename: filename,
                col: 10,
                line: 16,
                locations: [],
            })
        });
        instruction = "Abort_Handler:\n"+
            "0xbeef: 0xeafffffe     B         Abort_Handler           ; 0x184 ()";
        const lines = await disasm.fetchDisassembly("0xbeef", 10, 0, 0);
        Assert.deepStrictEqual(lines[0], {
            instruction: "\t\tAbort_Handler:",
            address: "0x000000000000beef",
            location: new Source("myfile.c", filename),
            symbol: "Abort_Handler",
            line: 15,
            endLine: 16,
            column: 0,
            endColumn: 10
        });
        // Only the first line should contain source information
        lines.slice(1).forEach(line => {
            Assert.strictEqual(line.location, undefined);
            Assert.strictEqual(line.line, undefined);
            Assert.strictEqual(line.endLine, undefined);
            Assert.strictEqual(line.column, undefined);
            Assert.strictEqual(line.endColumn, undefined);
        });
    });

});

debugAdapterSuite("Disassembly with real service", (dc, dbgConfig, fibonacciFile) => {

    // Testing disassemble requests against the real debugger in a device-independent way is difficult.
    // The source references are device-independent, though.
    test("Disassembly provides source lines", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const res = await dc().stackTraceRequest({threadId: 0});
                const stackFrames = res.body.stackFrames;
                Assert.strictEqual(stackFrames.length, 2);
                // Disassemble request is not yet added to the test support library
                const args: DebugProtocol.DisassembleArguments = {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                    memoryReference: stackFrames[0]?.instructionPointerReference!,
                    instructionCount: 1
                };
                const disAsm: DebugProtocol.DisassembleResponse = await dc().customRequest("disassemble", args);
                Assert.strictEqual(disAsm.body?.instructions.length, 1);
                const instr = disAsm.body.instructions[0];
                Assert.strictEqual(instr?.address, stackFrames[0]?.instructionPointerReference);
                Assert.strictEqual(instr?.location?.path, fibonacciFile());
                Assert.strictEqual(instr?.line, 43);
                Assert.strictEqual(instr?.endLine, 44);
            })
        ]);
    });
});