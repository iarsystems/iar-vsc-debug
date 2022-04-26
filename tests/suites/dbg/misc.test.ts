import * as Assert from "assert";
import * as Path from "path";
import { OsUtils } from "iar-vsc-common/osUtils";
import { debugAdapterSuite } from "./debugAdapterSuite";
import { TestUtils } from "../testUtils";

namespace Utils {
    // Given an ewp file and a source file in the same directory, returns
    // the path to the source file
    export function sourceFilePath(projDir: string, sourceName: string) {
        const sourcePath = Path.join(projDir, sourceName);
        return sourcePath;
    }

    // Given a path, returns a regex matching the path with either backward- or forward slashes
    export function pathRegex(path: string) {
        // Accept back- OR forward slashes
        path = path.replace(/[/\\]/g, "[/\\\\]");
        return new RegExp(`^${path}$`);
    }

}

/**
 * Tests directly against the debug adapter, using the DAP.
 * Here, we check that the adapter implements the protocol correctly, and that it communicates with cspyserver correctly.
 */
debugAdapterSuite("Test basic debug adapter functionality", (dc, dbgConfig, fibonacciFile, utilsFile) =>{
    const FIBS = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

    test("Unknown request produces error", async() => {
        try {
            await dc().send("illegal");
            Assert.fail("Unknown request did not prduce an error");
        } catch (_) {
        }
    });

    test("Returns supported features", async() => {
        const response = await dc().initializeRequest();
        Assert(response.body?.supportsConfigurationDoneRequest);
        Assert(response.body?.supportsEvaluateForHovers);
        Assert(response.body?.supportsTerminateRequest);
        Assert(response.body?.supportsSteppingGranularity);
        Assert(response.body?.supportsSetVariable);
    });

    test("Stops on entry", () => {
        const expectedPath = Utils.pathRegex(fibonacciFile());
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().assertStoppedLocation("entry", { line: 43, column: 1, path: expectedPath})
        ]);
    });

    test("Stops on end", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            TestUtils.assertStoppedLocation(dc(), "exit", 0, undefined, /__exit_0/)
        ]);
    });

    test("Shows stdout", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().assertOutput("stdout", "\n" + FIBS.join("\n"), 5000)
        ]);
    });

    test("Provides stack frames", async() => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        await dc().hitBreakpoint(
            dbgConfigCopy,
            { line: 60, path: utilsFile() });
        const res = await dc().stackTraceRequest({threadId: 0});
        Assert.strictEqual(res.body.stackFrames.length, 4);

        Assert(res.body.stackFrames[0]?.source?.path);
        Assert(OsUtils.pathsEqual(res.body.stackFrames[0]?.source?.path, utilsFile()), res.body.stackFrames[0]?.source?.path + " did not match " + utilsFile);
        Assert.strictEqual(res.body.stackFrames[0].name, "PutFib");
        Assert.strictEqual(res.body.stackFrames[0].line, 60);
        Assert(res.body.stackFrames[0]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));

        Assert(res.body.stackFrames[1]?.source?.path);
        Assert(OsUtils.pathsEqual(res.body.stackFrames[1]?.source?.path, fibonacciFile()), res.body.stackFrames[1]?.source?.path + " did not match " + fibonacciFile);
        Assert.strictEqual(res.body.stackFrames[1].name, "DoForegroundProcess");
        Assert.strictEqual(res.body.stackFrames[1].line, 38);
        Assert(res.body.stackFrames[1]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));

        Assert(res.body.stackFrames[2]?.source?.path);
        Assert(OsUtils.pathsEqual(res.body.stackFrames[2]?.source?.path, fibonacciFile()), res.body.stackFrames[2]?.source?.path + " did not match " + fibonacciFile);
        Assert.strictEqual(res.body.stackFrames[2].name, "main");
        Assert.strictEqual(res.body.stackFrames[2].line, 51);
        Assert(res.body.stackFrames[2]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));

        Assert.strictEqual(res.body.stackFrames[3]?.source, undefined);
        Assert(res.body.stackFrames[3]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));
    });


    test("Handles eval requests", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                let res = await dc().evaluateRequest({expression: "2"});
                Assert.strictEqual(res.body.result, "2");
                res = await dc().evaluateRequest({expression: "callCount"});
                Assert.strictEqual(res.body.result, "0");
                res = await dc().evaluateRequest({expression: "str"});
                Assert.match(res.body.result, /"This is a sträng"$/);
                try {
                    res = await dc().evaluateRequest({expression: "illegal"});
                    Assert.fail("Does not fail when evaluating nonexistent symbol");
                } catch (e) {
                }

                // Evaling nested variables
                const fibArray = (await dc().evaluateRequest({expression: "Fib"})).body;
                Assert.strictEqual(fibArray.result, "<array>");
                Assert(fibArray.type !== undefined);
                Assert.match(fibArray.type, /uint32_t\[10\] @ 0x/);
                Assert(fibArray.variablesReference > 0); // Should be nested
                const arrContents = (await dc().variablesRequest({variablesReference: fibArray.variablesReference})).body.variables;
                Assert.strictEqual(arrContents.length, 10);
                for (let i = 0; i < 10; i++) {
                    Assert.strictEqual(arrContents[i]!.name, `[${i}]`);
                    Assert.strictEqual(arrContents[i]!.value, "0");
                    Assert.match(arrContents[i]!.type!, /uint32_t @ 0x/);
                    // check that evaluateName property is correct
                    const evalResult = (await dc().evaluateRequest({expression: arrContents[i]!.evaluateName!})).body;
                    Assert.strictEqual(evalResult.result, arrContents[i]!.value);
                    Assert.strictEqual(evalResult.type, arrContents[i]!.type);
                    Assert.strictEqual(evalResult.memoryReference, arrContents[i]!.memoryReference);
                }

                {
                    const nestedStruct = (await dc().evaluateRequest({expression: "nested_struct"})).body;
                    Assert(nestedStruct !== undefined);
                    Assert(nestedStruct.variablesReference > 0);
                    const nestedContents = (await dc().variablesRequest({variablesReference: nestedStruct.variablesReference})).body.variables;
                    const innerUnion = nestedContents.find(variable => variable.name === "un");
                    Assert(innerUnion !== undefined);
                    Assert(innerUnion.variablesReference > 0);
                    const innerContents = (await dc().variablesRequest({variablesReference: innerUnion.variablesReference})).body.variables;
                    Assert.strictEqual(innerContents.length, 2);
                    const innerChar = innerContents.find(variable => variable.name === "b");
                    Assert(innerChar !== undefined);
                    Assert.strictEqual(innerChar.value, "'\\0' (0x00)");
                    Assert(innerChar.type !== undefined);
                    Assert.match(innerChar.type, /char/);

                    const evalResult = (await dc().evaluateRequest({expression: innerChar.evaluateName!})).body;
                    Assert.strictEqual(evalResult.result, innerChar.value);
                    Assert.strictEqual(evalResult.type, innerChar.type);
                    Assert.strictEqual(evalResult.memoryReference, innerChar.memoryReference);
                }
            })
        ]);
    });

    test("Supports read and write memory", () => {
        /// This test assumes ints are at least 4 bytes and that memory is little-endian, which may not be true in all cases
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 1});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});
                const staticsScope = scopes.body.scopes[1]!;

                const vars = await dc().variablesRequest({ variablesReference: staticsScope.variablesReference });
                const callCount = vars.body.variables.find(variable => variable.name.startsWith("callCount"));
                Assert(callCount);
                Assert(callCount?.memoryReference);

                // Read the variable value from memory --- should be 10
                const response = await dc().customRequest("readMemory", { memoryReference: callCount.memoryReference, count: 4 });
                const data = Buffer.from(response.body?.data, "base64");
                Assert.deepStrictEqual(data, Buffer.from([10, 0, 0, 0]));

                // Write a new value to the variable memory --- 0x010011ff
                await dc().customRequest("writeMemory", { memoryReference: callCount.memoryReference, data: Buffer.from([0xff, 0x11, 0x00, 0x01]).toString("base64")});

                {
                    // Make sure the variable value now matches what we set
                    const updatedVars = await dc().variablesRequest({ variablesReference: staticsScope.variablesReference });
                    const updatedCallCount = updatedVars.body.variables.find(variable => variable.name.startsWith("callCount"));
                    Assert(updatedCallCount);
                    Assert.strictEqual(updatedCallCount?.value, "16'781'823");
                }
            })
        ]);
    });

    test("Supports terminal input", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            // Wait until the client is ready to accept input
            dc().waitForEvent("stopped").then(async() => {
                // Sending input to the program is automatically handled in the test setup function at the top of the file.
                // Here we just have to verify that the variables are set according to the input.
                const stack = await dc().stackTraceRequest({ threadId: 1});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});
                const staticsScope = scopes.body.scopes[1]!;

                const vars = await dc().variablesRequest({ variablesReference: staticsScope.variablesReference });
                const int = vars.body.variables.find(variable => variable.name.startsWith("scan_to_me"));
                Assert(int);
                Assert.strictEqual(int.value, "1'234");
                const buf = vars.body.variables.find(variable => variable.name.startsWith("buf"));
                Assert(buf);
                Assert.strictEqual(buf.value, "<array>\"hello\"");
            }),
        ]);
    });
});
