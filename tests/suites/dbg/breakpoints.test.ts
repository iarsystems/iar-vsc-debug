/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import { debugAdapterSuite } from "./debugAdapterSuite";
import { DebugProtocol } from "@vscode/debugprotocol";
import { TestUtils } from "../testUtils";
import { TestConfiguration } from "../testConfiguration";
import { CustomRequest } from "../../../src/dap/customRequest";
import { CodeBreakpointMode } from "../../../src/dap/breakpoints/breakpointMode";

debugAdapterSuite("Breakpoints", (dc, dbgConfig, fibonacciFile, utilsFile) => {

    let expressionToIntString: (expr: string) => string = (expr) => {
        return expr;
    };

    suiteSetup(() =>{
        if (TestConfiguration.getConfiguration().debugConfiguration.target === "msp430") {
            expressionToIntString = (actual: string): string => {
                const indexFirst = actual.indexOf("(");
                const indexLast = actual.indexOf(")", indexFirst + 1);
                return parseInt(actual.substring(indexFirst + 1, indexLast)).toString();
            };
        }
    });

    test("Hits breakpoint", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 36}] });
                await Promise.all([
                    dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 36}),
                    dc().continueRequest({threadId: 0, singleThread: true}),
                ]);
            }),
        ]);
    });

    test("Moves breakpoints on empty lines", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("initialized").then(async() => {
                const response = await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 25}, {line: 29}, {line: 31}, {line: 46}] });
                const bps = response.body.breakpoints;
                Assert.strictEqual(bps.length, 4);

                Assert.strictEqual(bps[0]?.line, 25);
                Assert(!bps[0]?.verified);
                Assert.strictEqual(bps[1]?.line, 29);
                Assert(bps[1]?.verified);
                Assert.strictEqual(bps[2]?.line, 35);
                Assert(bps[2]?.verified);
                Assert.strictEqual(bps[3]?.line, 47);
                Assert(bps[3]?.verified);
            }),
        ]);
    });

    test("Removes breakpoints", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                let response = await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 47}, {line: 49}] });
                let bps = response.body.breakpoints;
                Assert.strictEqual(bps.length, 2);
                Assert.strictEqual(bps[0]?.line, 47);
                Assert(bps[0]?.verified);
                Assert.strictEqual(bps[1]?.line, 49);
                Assert(bps[1]?.verified);

                response = await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 49}] });
                bps = response.body.breakpoints;
                Assert.strictEqual(bps.length, 1);
                Assert.strictEqual(bps[0]?.line, 49);
                Assert(bps[0]?.verified);

                await Promise.all([
                    dc().continueRequest({threadId: 0, singleThread: true}),
                    dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 49 })
                ]);
            }),
        ]);
    });

    test("Hits instruction breakpoint", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const res = await dc().evaluateRequest({expression: "PutFib"});
                Assert(res.body.memoryReference);
                const args: DebugProtocol.SetInstructionBreakpointsArguments = {
                    breakpoints: [{instructionReference: res.body.memoryReference}]
                };
                const bpRes: Partial<DebugProtocol.SetInstructionBreakpointsResponse> = await dc().customRequest("setInstructionBreakpoints", args);
                Assert(bpRes.body?.breakpoints[0]?.verified);
                Assert.strictEqual(bpRes.body.breakpoints[0]?.instructionReference, res.body.memoryReference);
                await Promise.all([
                    dc().continueRequest({threadId: 0, singleThread: true}),
                    TestUtils.assertStoppedLocation(dc(), "breakpoint", 50, utilsFile(), /PutFib/)
                ]);
            }),
        ]);
    });

    test("Hits conditional breakpoint", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 51, condition: "callCount == 5"}] });
                await Promise.all([
                    dc().continueRequest({threadId: 0, singleThread: true}),
                    dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 51}).then(async() => {
                        const callCount = await dc().evaluateRequest({ expression: "callCount" });
                        Assert.strictEqual(expressionToIntString(callCount.body.result), "5");
                    }),
                ]);
            }),
        ]);
    });
    test("Hits hit-conditional breakpoint", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    {
                        source: { path: fibonacciFile() },
                        breakpoints: [{ line: 51, hitCondition: "3" }]
                    });
                await Promise.all([
                    dc().continueRequest({ threadId: 0, singleThread: true }),
                    dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 51 }).then(async() => {
                        const callCount = await dc().evaluateRequest({ expression: "callCount" });
                        Assert.strictEqual(expressionToIntString(callCount.body.result), "3");
                    }),
                ]);
            }),
        ]);
    });

    test("Hits data breakpoints", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});
                const statics = (await dc().variablesRequest({variablesReference: scopes.body.scopes[1]!.variablesReference})).body.variables;

                {
                    const callCount = statics.find(variable => variable.name.startsWith("callCount"));
                    Assert(callCount);

                    const breakInfo = await dc().dataBreakpointInfoRequest({name: callCount.name, variablesReference: scopes.body.scopes[1]!.variablesReference});
                    Assert.strictEqual(breakInfo.body.dataId, "callCount");

                    const getCallCountVariable = async() => {
                        const stack = await dc().stackTraceRequest({ threadId: 0});
                        const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});
                        const statics = (await dc().variablesRequest({variablesReference: scopes.body.scopes[1]!.variablesReference})).body.variables;
                        return statics.find(variable => variable.name.startsWith("callCount"));
                    };

                    await dc().setDataBreakpointsRequest(
                        {breakpoints: [{dataId: breakInfo.body.dataId, accessType: "write" }] });
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().waitForEvent("stopped", 2000).then(async ev => {
                            // should be right after callCount is set to 0
                            Assert.strictEqual(ev.body["reason"], "breakpoint");
                            const callCount = await getCallCountVariable();
                            Assert(callCount);
                            Assert.strictEqual(expressionToIntString(callCount.value), "0");
                        }),
                    ]);
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().waitForEvent("stopped", 2000).then(async ev => {
                            // should be right after callCount is first incremented
                            Assert.strictEqual(ev.body["reason"], "breakpoint");
                            const callCount = await getCallCountVariable();
                            Assert(callCount);
                            Assert.strictEqual(expressionToIntString(callCount.value), "1");
                        }),
                    ]);

                    // The rest of this test uses exact line numbers, and
                    // requires that data breakpoints reliably stop exactly when
                    // the access occurs.
                    if (TestConfiguration.getConfiguration().dataBreakpointsAreUnreliable) {
                        return;
                    }

                    await dc().setDataBreakpointsRequest(
                        {breakpoints: [{dataId: breakInfo.body.dataId, accessType: "read" }] });
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 37}),
                    ]);

                    await dc().setDataBreakpointsRequest(
                        {breakpoints: [{dataId: breakInfo.body.dataId, accessType: "readWrite" }] });
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 49}),
                    ]);
                }

                {
                    const referencesSelf = statics.find(variable => variable.name.startsWith("references_self"));
                    Assert(referencesSelf);
                    const subVars = (await dc().variablesRequest({variablesReference: referencesSelf.variablesReference})).body.variables;
                    const a = subVars.find(variable => variable.name === "a");
                    Assert(a);

                    const breakInfo = await dc().dataBreakpointInfoRequest({name: a.name, variablesReference: referencesSelf.variablesReference});
                    Assert(breakInfo.body.dataId);

                    await dc().setDataBreakpointsRequest(
                        {breakpoints: [{dataId: breakInfo.body.dataId, accessType: "write" }] });
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 57}),
                    ]);
                }
            }),
        ]);
    });

    test("Supports log breakpoints", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const logMessage = "häj%% %n%c\"42\\ಠ⌣ಠ";

                await dc().setBreakpointsRequest(
                    { source: { path: utilsFile() },
                        breakpoints: [{line: 26, logMessage: logMessage + "\n"}] });

                await Promise.all([
                    dc().assertOutput("console", "[Utilities.c:26.3] #0 " + logMessage, 5000),
                    dc().continueRequest({threadId: 0, singleThread: true}),
                ]);
            }),
        ]);
    });

    test("Supports log breakpoints with interpolation", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {

                const message1 = "{callCount}";
                const message2 = "Value: \"{callCount}\"!";

                await dc().setBreakpointsRequest({
                    source: { path: utilsFile() },
                    breakpoints: [
                        { line: 26, logMessage: message1 },
                        { line: 28, logMessage: message2 },
                    ],
                });

                // msp430 uses char as output and 0 is represented as \0.
                await Promise.all([
                    dc().assertOutput(
                        "console",
                        `[Utilities.c:26.3] #0 ${message1}\n[Utilities.c:28.3] #0 ${message2}`.replaceAll(
                            "{callCount}",
                            TestConfiguration.getConfiguration().debugConfiguration.target === "msp430" ? "" : "0",
                        ),
                        5000,
                    ),
                    dc().continueRequest({ threadId: 0, singleThread: true }),
                ]);
            }),
        ]);
    });

    test("Supports breakpoint modes", function() {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const response = await dc().customRequest(CustomRequest.Names.GET_BREAKPOINT_MODES);
                Assert(response.success);
                const supportedModes: CustomRequest.GetBreakpointModesResponse = response.body;
                if (!supportedModes.includes(CodeBreakpointMode.TraceStart)) {
                    this.skip();
                    return;
                }

                // Make sure we can set an explicit mode for breakpoints (e.g.
                // clicking "Edit breakpoint" in VS Code)
                {
                    const bpRes = await dc().setBreakpointsRequest({
                        source: { path: utilsFile() },
                        breakpoints: [
                            { line: 26, mode: CodeBreakpointMode.TraceStart },
                        ],
                    });
                    Assert(bpRes.success);
                    Assert(bpRes.body.breakpoints[0]);
                    Assert(bpRes.body.breakpoints[0].verified);
                    Assert(bpRes.body.breakpoints[0].message);
                    Assert.match(bpRes.body.breakpoints[0].message, /TraceStart/);
                }

                // Make sure we can use our custom requests to set the mode
                {
                    const res = await dc().customRequest(
                        CustomRequest.Names.SET_BREAKPOINT_MODE,
                        CodeBreakpointMode.TraceStart,
                    );
                    Assert(res.success);

                    const bpRes = await dc().setBreakpointsRequest({
                        source: { path: utilsFile() },
                        breakpoints: [{ line: 26 }],
                    });
                    Assert(bpRes.success);
                    Assert(bpRes.body.breakpoints[0]);
                    Assert(bpRes.body.breakpoints[0].verified);
                    Assert(bpRes.body.breakpoints[0].message);
                    Assert.match(bpRes.body.breakpoints[0].message, /TraceStart/);

                    // Change back to auto for further testing
                    const res2 = await dc().customRequest(
                        CustomRequest.Names.SET_BREAKPOINT_MODE,
                        CodeBreakpointMode.Auto,
                    );
                    Assert(res2.success);
                }

                // Make sure we can use our custom console commands to set the mode
                {
                    // First figure out what the command is called
                    const res = await dc().completionsRequest({
                        text: "",
                        column: 0,
                    });
                    Assert(res.success);
                    const command = res.body.targets.find(item =>
                        item.label.includes("trace_start")
                    );
                    Assert(
                        command,
                        "Did not find a command to use: " +
                            res.body.targets.map(item => item.label).join(", "),
                    );
                    const res2 = await dc().evaluateRequest({
                        expression: command.label,
                        context: "repl",
                    });
                    Assert(res2.success);

                    const bpRes = await dc().setBreakpointsRequest({
                        source: { path: utilsFile() },
                        breakpoints: [{ line: 26 }],
                    });
                    Assert(bpRes.success);
                    Assert(bpRes.body.breakpoints[0]);
                    Assert(bpRes.body.breakpoints[0].verified);
                    Assert(bpRes.body.breakpoints[0].message);
                    Assert.match(bpRes.body.breakpoints[0].message, /TraceStart/);

                    // Change back to auto for further testing
                    const res3 = await dc().customRequest(
                        CustomRequest.Names.SET_BREAKPOINT_MODE,
                        CodeBreakpointMode.Auto,
                    );
                    Assert(res3.success);
                }

                // Make sure we fail with an error message if the user chooses
                // an unsupported mode
                {
                    const unsupportedMode = Object.values(CodeBreakpointMode).find(
                        mode => !supportedModes.includes(mode),
                    );
                    if (unsupportedMode) {
                        const bpRes = await dc().setBreakpointsRequest({
                            source: { path: utilsFile() },
                            breakpoints: [
                                { line: 26, mode: unsupportedMode },
                            ],
                        });
                        Assert(bpRes.success);
                        Assert(bpRes.body.breakpoints[0]);
                        Assert(!bpRes.body.breakpoints[0].verified);
                        Assert(bpRes.body.breakpoints[0].message);
                    }
                }
            }),
        ]);
    });
});