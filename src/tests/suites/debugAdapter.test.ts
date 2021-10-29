import * as Assert from "assert";
import * as Path from 'path';
import * as vscode from 'vscode';
import { DebugClient } from 'vscode-debugadapter-testsupport';
import { TestUtils } from './testUtils';
import { TestSandbox } from "../../utils/testutils/testSandbox";
import { ChildProcess, spawn } from "child_process";
import { OsUtils } from "../../utils/osUtils";

namespace Utils {
    // Given an ewp file and a source file in the same directory, returns
    // the path to the source file
    export function sourceFilePath(ewpFile: string, sourceName: string) {
        let sourcePath = Path.join(Path.dirname(ewpFile), sourceName);
        return sourcePath;
    }

    // Given a path, returns a regex matching the path on any OS.
    export function pathRegex(path: string) {
        // Accept back- OR forward slashes
        path = path.replace(/[\/\\]/g, "[\\/\\\\]");
        const pattern = `^${path}$`;
        // Note that we use case-insensitive paths on windows
        return new RegExp(pattern, OsUtils.detectOsType() === OsUtils.OsType.Windows ? "i" : undefined);
    }

    export function assertStoppedLocation(dc: DebugClient, reason: string, line: number, file: string | undefined, name: RegExp) {
        return dc.waitForEvent("stopped").then(async (event) => {
            Assert.equal(event.body?.reason, reason);
            const stack = await dc.stackTraceRequest({threadId: 1});
            const topStack = stack.body.stackFrames[0];
            Assert.equal(topStack.line, line);
            Assert.equal(topStack.source?.path, file);
            Assert.match(topStack.name, name);
        });
    }
}

/**
 * Tests directly against the debug adapter, using the DAP.
 * Here, we check that the adapter implements the protocol correctly, and that it communicates with cspyserver correctly.
 */
suite("Test Debug Adapter", () =>{
    const ADAPTER_PORT = 4711;
    const FIBS = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]

    const dbgConfig: any = {
        projectConfiguration: "Debug",
        driverLib: "armsim2",
        driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting", "--multicore_nr_of_cores=1"],
        stopOnEntry:true
    }

    let sandbox = new TestSandbox(TestUtils.PROJECT_ROOT);
    let fibonacciFile: string = "";
    let utilsFile: string = "";

    suiteSetup(() => {
        // Create a folder where we can build and debug the project
        const testProjectsPath = sandbox.copyToSandbox(Path.join(TestUtils.PROJECT_ROOT, "src/tests/TestProjects/"));
        dbgConfig.projectPath = Path.join(testProjectsPath, "GettingStarted/BasicDebugging.ewp");
        dbgConfig.program = Path.join(testProjectsPath, "GettingStarted/Debug/Exe/BasicDebugging.out");

        // Find a workbench to build with
        const installDirs = TestUtils.getEwPaths();
        Assert(installDirs, "No workbenches found to use for debugging");
        // For now just use the first entry, and assume it points directly to a top-level ew directory
        const workbench = installDirs[0];

        dbgConfig.workbenchPath = workbench;
        TestUtils.buildProject(dbgConfig.workbenchPath, dbgConfig.projectPath, "Debug");

        fibonacciFile = Utils.sourceFilePath(dbgConfig.projectPath, "Fibonacci.c");
        utilsFile = Utils.sourceFilePath(dbgConfig.projectPath, "Utilities.c");
    });

    let dc: DebugClient;
    let debugAdapter: ChildProcess;

    suiteSetup(async ()=>{
        // For some reason DebugClient isnt able to start the adapter itself, so start it manually as a tcp server
        debugAdapter = spawn("node", [Path.join(__dirname, '../../dap/cspyDebug.js'), `--server=${ADAPTER_PORT}`]);
        debugAdapter.stdout?.on("data", dat => {console.log("OUT: " + dat.toString())});
        debugAdapter.stderr?.on("data", dat => {console.log("ERR: " + dat.toString())});
        // Need to wait a bit for the adapter to start
        await TestUtils.wait(2000);
    });

    suiteTeardown(() => {
        debugAdapter.kill();
    });

    setup(async () => {
        dc = new DebugClient('node', '', 'cspy');
        await dc.start(ADAPTER_PORT);
    });

    teardown(async ()=>{
        await dc.stop();
        // Need to wait a bit for the adapter to be ready again
        await TestUtils.wait(1000);
    });


    test("Unknown request produces error", async () => {
        try {
            await dc.send("illegal");
            Assert.fail("Unknown request did not prduce an error");
        } catch(e) {
            console.log(e);
        }
    });

    test("Returns supported features", async () => {
        const response = await dc.initializeRequest();
        Assert(response.body?.supportsConfigurationDoneRequest);
        Assert(response.body?.supportsEvaluateForHovers);
        Assert(response.body?.supportsTerminateRequest);
        Assert(response.body?.supportsSteppingGranularity);
        Assert(response.body?.supportsSetVariable);
    });

    test("Stops on entry", async () => {
        const expectedPath = Utils.pathRegex(fibonacciFile);
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.assertStoppedLocation("entry", { line: 43, column: 1, path: expectedPath})
        ]);
    });

    test("Stops on end", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfigCopy),
            Utils.assertStoppedLocation(dc, "exit", 0, undefined, /__exit_0/)
        ]);
    });

    test("Shows stdout", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfigCopy),
            dc.assertOutput("stdout", "\n" + FIBS.join("\n"), 5000)
        ]);
    });

    test("Hits breakpoint", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc.configurationSequence(),
            dc.hitBreakpoint(
                dbgConfigCopy,
                { line: 36, path: fibonacciFile }
            ),
        ]);
    });

    test("Moves breakpoints on empty lines", () => {
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.waitForEvent("initialized").then(async () => {
                const response = await dc.setBreakpointsRequest(
                                            { source: { path: fibonacciFile },
                                                breakpoints: [{line: 25}, {line: 29}, {line: 31}, {line: 46}] });
                const bps = response.body.breakpoints;
                Assert.equal(bps.length, 4);

                Assert.equal(bps[0].line, 25);
                Assert(!bps[0].verified);
                Assert.equal(bps[1].line, 29);
                Assert(bps[1].verified);
                Assert.equal(bps[2].line, 36);
                Assert(bps[2].verified);
                Assert.equal(bps[3].line, 47);
                Assert(bps[3].verified);
            }),
        ]);
    });

    test("Supports setting breakpoints before launch", () => {
        // We need to send the launch request before breakpoints can be set in the backend and verified
        // (because we need to know where the workbench is located). In practice this doesn't seem to be a problem (yet).
        // However DAP clients may set breakpoints slightly before the launch request is started, so we need to support that.
        return Promise.all([
            dc.configurationSequence(),
            dc.initializeRequest().then(async () => {
                const response = await dc.setBreakpointsRequest(
                                            { source: { path: Utils.sourceFilePath(dbgConfig.projectPath, "Fibonacci.c") },
                                                breakpoints: [{line: 47}] });
                TestUtils.wait(1000).then(() => dc.launchRequest(dbgConfig));
                Assert.equal(response.body.breakpoints[0].line, 47);
                Assert(response.body.breakpoints[0].verified);
            }),
        ]);
    });

    test("Shows variable values", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfigCopy),
            dc.waitForEvent("stopped").then(async () => {
                // Locals are tested in other test cases
                const scopes = await dc.scopesRequest({frameId: 0});

                const statics = (await dc.variablesRequest({variablesReference: scopes.body.scopes[1].variablesReference})).body.variables;
                Assert.equal(statics.length, 3);
                Assert(statics.some(variable => variable.name === "str" && variable.value.match(/"This is a sträng"$/) && variable.type?.match(/char const \* @ 0x/)));

                const fibArray = statics.find(variable => variable.name === "Fib");
                Assert(fibArray !== undefined);
                Assert.equal(fibArray.value, "<array>");
                Assert(fibArray.type !== undefined);
                Assert.match(fibArray.type, /uint32_t\[10\] @ 0x/);
                Assert(fibArray.variablesReference > 0); // Should be nested
                const arrContents = (await dc.variablesRequest({variablesReference: fibArray.variablesReference})).body.variables;
                Assert.equal(arrContents.length, 10);
                for (let i = 0; i < 10; i++) {
                    Assert.equal(arrContents[i].name, `[${i}]`);
                    Assert.equal(arrContents[i].value, FIBS[i].toString());
                    Assert.match(arrContents[i].type!, /uint32_t @ 0x/);
                }

                const registers = (await dc.variablesRequest({variablesReference: scopes.body.scopes[2].variablesReference})).body.variables;
                Assert(registers.some(reg => reg.name === "R4"));
                Assert(registers.some(reg => reg.name === "SP"));
                Assert(registers.some(reg => reg.name === "PC"));
                Assert(registers.some(reg => reg.name === "CPSR" && reg.variablesReference > 0)); // Should be nested
            }),
        ]);
    });

    test("Supports stepping", () => {
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.waitForEvent("stopped").then(async () => {
                for (let i = 0; i < 4; i++) {
                    await Promise.all([
                        dc.nextRequest({threadId: 1}),
                        Utils.assertStoppedLocation(dc, "step", 45 + i*2,
                                                    fibonacciFile, /main/),
                    ]);
                }
                await Promise.all([
                    dc.stepInRequest({threadId: 1}),
                    Utils.assertStoppedLocation(dc, "step", 35, fibonacciFile, /DoForegroundProcess/)
                ]);
                await dc.setBreakpointsRequest({ source: { path: utilsFile },
                                                breakpoints: [{line: 54}] });
                await Promise.all([
                    dc.continueRequest({threadId: 1}),
                    Utils.assertStoppedLocation(dc, "breakpoint", 54, utilsFile, /PutFib/).then(async () => {
                        const stack = (await dc.stackTraceRequest({threadId: 1})).body.stackFrames;
                        Assert(stack.length >= 3);
                        Assert.equal(stack[1].name, "DoForegroundProcess");
                        Assert.equal(stack[1].line, 38);
                        Assert.equal(stack[1].source?.path, fibonacciFile);

                        const res = await dc.scopesRequest({frameId: stack[1].id});
                        console.log(res.body.scopes[0].name);
                        const vars = (await dc.variablesRequest({variablesReference: res.body.scopes[0].variablesReference})).body.variables;
                        Assert.equal(vars.length, 1);
                        Assert.equal(vars[0].name, "fib");
                        Assert.equal(vars[0].value, "2");
                        Assert.equal(vars[0].type, "uint32_t volatile");
                    })
                ]);
            })
        ]);
    });
    test("Supports instruction stepping", () => {
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.waitForEvent("stopped").then(async () => {
                for (let i = 0; i < 3; i++) {
                    await Promise.all([
                        dc.nextRequest({threadId: 1, granularity: "instruction"}),
                        Utils.assertStoppedLocation(dc, "step", 45,
                                                    fibonacciFile, /main/),
                    ]);
                }
                await Promise.all([
                    dc.nextRequest({threadId: 1, granularity: "instruction"}),
                    Utils.assertStoppedLocation(dc, "step", 47,
                                                fibonacciFile, /main/),
                ]);
            })
        ]);
    });

    test("Variables change when stepping", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc.configurationSequence(),
            dc.hitBreakpoint(
                dbgConfigCopy,
                { line: 37, path: fibonacciFile }
            ).then(async () => {
                let scopes = await dc.scopesRequest({frameId: 0});
                let locals = (await dc.variablesRequest({variablesReference: scopes.body.scopes[0].variablesReference})).body.variables;
                Assert.equal(locals.length, 1);
                Assert(locals.some(variable => variable.name === "fib" && variable.value === "<unavailable>" && variable.type === "uint32_t"));

                await Promise.all([ dc.nextRequest({threadId: 0}), dc.waitForEvent("stopped") ]);

                scopes = await dc.scopesRequest({frameId: 0});
                locals = (await dc.variablesRequest({variablesReference: scopes.body.scopes[0].variablesReference})).body.variables;
                Assert.equal(locals.length, 1);
                Assert(locals.some(variable => variable.name === "fib" && variable.value === "1" && variable.type === "uint32_t"));
            }),
        ]);
    });

    test("Handles eval requests", () => {
        return Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.waitForEvent("stopped").then(async() => {
                let res = await dc.evaluateRequest({expression: "2"});
                Assert.equal(res.body.result, "2");
                res = await dc.evaluateRequest({expression: "callCount"});
                Assert.equal(res.body.result, "0");
                res = await dc.evaluateRequest({expression: "str"});
                Assert.match(res.body.result, /"This is a sträng"$/);
                try {
                    res = await dc.evaluateRequest({expression: "illegal"});
                    Assert.fail("Does not fail when evaluating nonexistent symbol");
                } catch (e) {
                }
            })
        ]);
    });

    // Assert stepping, next into out etc. (with stack)
    // Pause?
    // Eval
});