/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DebugProtocol } from "@vscode/debugprotocol";
import * as Assert from "assert";
import { OsUtils } from "iar-vsc-common/osUtils";
import { CSpyLaunchRequestArguments } from "../../../src/dap/cspyDebug";
import { CustomRequest } from "../../../src/dap/customRequest";
import { TestConfiguration } from "../testConfiguration";
import { TestUtils } from "../testUtils";
import { debugAdapterSuite } from "./debugAdapterSuite";

/**
 * Tests directly against the debug adapter, using the DAP.
 * Here, we check that the adapter implements the protocol correctly, and that it communicates with cspyserver correctly.
 */
debugAdapterSuite("Test multicore debugging", function(dc, dbgConfig, fibonacciFile, utilsFile) {
    let nCores: number;
    let config: CSpyLaunchRequestArguments;

    suiteSetup(function() {
        if (TestConfiguration.getConfiguration().smokeTestsOnly) {
            this.skip();
            return;
        }
        const numCores = TestConfiguration.getConfiguration().multicoreNrOfCores;
        if (numCores === undefined || numCores <= 1) {
            this.skip();
        }
        nCores = numCores;
        config = {
            ...dbgConfig(),
            driverOptions: dbgConfig().driverOptions.concat(["--multicore_nr_of_cores=" + nCores]),
        };
        dbgConfig = () => {
            throw new Error("Tried to use the standard debug config in a multicore test, use the modified config instead");
        };
    });

    test("Stops on entry", () => {
        const configCopy: CSpyLaunchRequestArguments = JSON.parse(JSON.stringify(config));
        configCopy.stopOnSymbol = true;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(configCopy),
            dc().waitForEvent("stopped").then(async(ev) => {
                Assert.strictEqual(ev.body?.reason, "entry");
                Assert.strictEqual(ev.body?.allThreadsStopped, true);
                for (let core = 0; core < nCores; core++) {
                    const stack = await dc().stackTraceRequest({threadId: core});
                    Assert.strictEqual(stack.body.stackFrames[0]?.source?.name, "cstartup.s");
                }
            }),
        ]);
    });

    test("Lists all cores", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async() => {
                const threads = await dc().threadsRequest();
                Assert.strictEqual(threads.body.threads.length, nCores);
            }),
        ]);
    });

    test("Supports stepping", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            TestUtils.assertStoppedLocation(dc(), "entry", 43, fibonacciFile(), /main/, 0).then(async() => {
                const core1Location = (await dc().stackTraceRequest({threadId: 1})).body.stackFrames[0]!;
                for (let i = 0; i < 4; i++) {
                    await Promise.all([
                        dc().nextRequest({threadId: 0, singleThread: true}),
                        TestUtils.assertStoppedLocation(dc(), "step", 45 + i*2,
                            fibonacciFile(), /main/, 0),
                    ]);
                }
                await Promise.all([
                    dc().stepInRequest({threadId: 0, singleThread: true}),
                    TestUtils.assertStoppedLocation(dc(), "step", 35, fibonacciFile(), /DoForegroundProcess/, 0)
                ]);
                // Other thread(s) should not have moved
                await TestUtils.assertLocationIs(
                    dc(),
                    core1Location.line,
                    core1Location.source?.path,
                    new RegExp(
                        `^${TestUtils.escapeRegex(core1Location.name)}$`,
                    ),
                    1,
                );

                await Promise.all([
                    dc().nextRequest({threadId: 1, singleThread: false}),
                    TestUtils.assertStoppedLocation(dc(), "step", 36, fibonacciFile(), /DoForegroundProcess/, 0)
                ]);
            }),
        ]);
    });

    test("Supports go all cores", function() {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async function() {
                await dc().continueRequest({ threadId: 0, singleThread: false });

                await dc().waitForEvent("stopped").then((ev: Partial<DebugProtocol.StoppedEvent>) => {
                    Assert.strictEqual(ev.body!.reason, "exit");
                });
                for (let i = 0; i < nCores; i++) {
                    const stack = await dc().stackTraceRequest({threadId: i});
                    Assert.notStrictEqual(stack.body.stackFrames[0]?.line, 43);
                }
            }),
        ]);
    });
    test("Supports go single core", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async() => {
                const core0Location = (await dc().stackTraceRequest({threadId: 0})).body.stackFrames[0]!;
                await dc().setBreakpointsRequest({source: { path: fibonacciFile() }, breakpoints: [{line: 60}] });
                await Promise.all([
                    dc().waitForEvent("stopped").then(async(ev: Partial<DebugProtocol.StoppedEvent>) => {
                        Assert.strictEqual(ev.body!.threadId, 1);
                        Assert.strictEqual(ev.body!.reason, "breakpoint");
                        await TestUtils.assertLocationIs(dc(), core0Location.line, core0Location.source?.path, new RegExp(`^${core0Location.name}$`), 0);
                        await TestUtils.assertLocationIs(dc(), 60, fibonacciFile(), /main/, 1);
                    }),
                    dc().continueRequest({threadId: 1, singleThread: true}),
                ]);
            }),
        ]);
    });
    test("Supports breakpoints and stack frames", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    { source: { path: utilsFile() },
                        breakpoints: [{line: 60}] });
                await Promise.all([
                    dc().waitForEvent("stopped").then(async(ev: Partial<DebugProtocol.StoppedEvent>) => {
                        Assert.strictEqual(ev.body!.threadId, 1);
                        Assert.strictEqual(ev.body!.reason, "breakpoint");

                        {
                            const res = await dc().stackTraceRequest({threadId: 1});
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

                            Assert(res.body.stackFrames[3]?.source?.path);
                            Assert.match(res.body.stackFrames[3]?.source?.path, /cstartup.s/);
                            Assert(res.body.stackFrames[3]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));
                        }
                        {
                            const res = await dc().stackTraceRequest({threadId: 0});
                            Assert.strictEqual(res.body.stackFrames.length, 2);

                            Assert(res.body.stackFrames[0]?.source?.path);
                            Assert(OsUtils.pathsEqual(res.body.stackFrames[0]?.source?.path, fibonacciFile()), res.body.stackFrames[0]?.source?.path + " did not match " + fibonacciFile());
                            Assert.strictEqual(res.body.stackFrames[0].name, "main");
                            Assert.strictEqual(res.body.stackFrames[0].line, 43);
                            Assert(res.body.stackFrames[0]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));

                            Assert.strictEqual(res.body.stackFrames[1]?.source, undefined);
                            Assert(res.body.stackFrames[1]?.instructionPointerReference?.match(/0x[\da-fA-F]{16}/));
                        }
                    }),
                    await dc().continueRequest({threadId: 1, singleThread: true}),
                ]);
            }),
        ]);
    });
    test("Supports local variables", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 38}] });
                await Promise.all([
                    dc().waitForEvent("stopped").then(async() => {
                        const frames0 = await dc().stackTraceRequest({threadId: 0});
                        const scopes0 = await dc().scopesRequest({frameId: frames0.body.stackFrames[0]!.id});
                        const frames1 = await dc().stackTraceRequest({threadId: 1});
                        const scopes1 = await dc().scopesRequest({frameId: frames1.body.stackFrames[0]!.id});
                        {
                            const locals = (await dc().variablesRequest({variablesReference: scopes1.body.scopes[0]!.variablesReference}));
                            Assert.strictEqual(locals.body.variables.length, 1);
                            const fib = locals.body.variables.find(variable => variable.name === "fib");
                            Assert(fib);
                            Assert(fib.type);
                            Assert.match(fib.type, /uint32_t volatile @ 0x/);
                            Assert(Number.isInteger(Number(fib.value)));
                        }
                        {
                            const locals = (await dc().variablesRequest({variablesReference: scopes0.body.scopes[0]!.variablesReference}));
                            Assert.strictEqual(locals.body.variables.length, 1);
                            Assert(locals.body.variables.some(variable => variable.name === "test"));
                        }
                    }),
                    await dc().continueRequest({threadId: 1, singleThread: true}),
                ]);
            }),
        ]);
    });
    test("Supports eval", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 38}] });
                await Promise.all([
                    dc().waitForEvent("stopped").then(async() => {
                        const frames0 = await dc().stackTraceRequest({threadId: 0});
                        const frames1 = await dc().stackTraceRequest({threadId: 1});
                        const eval1 = await dc().evaluateRequest({expression: "fib", frameId: frames1.body.stackFrames[0]!.id});
                        Assert(
                            eval1.body.result !== "" &&
                                Number.isInteger(Number(eval1.body.result)),
                            eval1.body.result,
                        );
                        try {
                            await dc().evaluateRequest({expression: "fib", frameId: frames0.body.stackFrames[0]!.id});
                            Assert.fail("Successfully evaluated 'fib', but it should not exist in this context");
                        } catch {}
                    }),
                    await dc().continueRequest({threadId: 1, singleThread: true}),
                ]);
            }),
        ]);
    });

    test("Support setting lockstep mode", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(config),
            dc().waitForEvent("stopped").then(async() => {
                const core0Location = (await dc().stackTraceRequest({threadId: 0})).body.stackFrames[0]!;
                await dc().setBreakpointsRequest({source: { path: fibonacciFile() }, breakpoints: [{line: 49}] });

                await dc().customRequest(CustomRequest.Names.SET_LOCKSTEP_MODE_ENABLED, { enabled: false });
                await Promise.all([
                    dc().waitForEvent("stopped").then(async(ev: Partial<DebugProtocol.StoppedEvent>) => {
                        Assert.strictEqual(ev.body!.threadId, 1);
                        Assert.strictEqual(ev.body!.reason, "breakpoint");
                        await TestUtils.assertLocationIs(dc(), core0Location.line, core0Location.source?.path, new RegExp(`^${core0Location.name}$`), 0);
                        await TestUtils.assertLocationIs(dc(), 49, fibonacciFile(), /main/, 1);
                    }),
                    dc().continueRequest({threadId: 1}),
                ]);

                await dc().setBreakpointsRequest({source: { path: fibonacciFile() }, breakpoints: [] });
                await dc().customRequest(CustomRequest.Names.SET_LOCKSTEP_MODE_ENABLED, { enabled: true });
                const previousLines = await Promise.all([
                    (await dc().stackTraceRequest({threadId: 0})).body.stackFrames[0]!,
                    (await dc().stackTraceRequest({threadId: 1})).body.stackFrames[0]!,
                ]);
                await dc().continueRequest({ threadId: 0 });
                await dc().waitForEvent("stopped").then((ev: Partial<DebugProtocol.StoppedEvent>) => {
                    Assert.strictEqual(ev.body!.reason, "exit");
                });
                for (let i = 0; i < 2; i++) {
                    const stack = await dc().stackTraceRequest({threadId: i});
                    Assert.notStrictEqual(stack.body.stackFrames[0]?.line, previousLines[i]);
                }
            }),
        ]);
    });
});