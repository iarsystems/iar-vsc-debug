/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import { debugAdapterSuite } from "./debugAdapterSuite";
import { DebugProtocol } from "@vscode/debugprotocol";
import { TestUtils } from "../testUtils";

debugAdapterSuite("Breakpoints", (dc, dbgConfig, fibonacciFile, utilsFile) => {

    test("Hits breakpoint", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().hitBreakpoint(
                dbgConfigCopy,
                { line: 36, path: fibonacciFile() }
            ),
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
                    dc().continueRequest({threadId: 1}),
                    dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 49 })
                ]);
            }),
        ]);
    });

    test("Hits instruction breakpoint", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const res = await dc().evaluateRequest({expression: "PutFib"});
                Assert(res.body.memoryReference);
                const args: DebugProtocol.SetInstructionBreakpointsArguments = {
                    breakpoints: [{instructionReference: res.body.memoryReference}]
                };
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const bpRes: DebugProtocol.SetInstructionBreakpointsResponse = await dc().customRequest("setInstructionBreakpoints", args);
                Assert(bpRes.body.breakpoints[0]?.verified);
                Assert.strictEqual(bpRes.body.breakpoints[0]?.instructionReference, res.body.memoryReference);
                await Promise.all([
                    dc().continueRequest({threadId: 0}),
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
                        Assert.strictEqual(callCount.body.result, "5");
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
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 51, hitCondition: "3"}] });
                await Promise.all([
                    dc().continueRequest({threadId: 0, singleThread: true}),
                    dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 51}).then(async() => {
                        const callCount = await dc().evaluateRequest({ expression: "callCount" });
                        Assert.strictEqual(callCount.body.result, "3");
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

                    await dc().setDataBreakpointsRequest(
                        {breakpoints: [{dataId: breakInfo.body.dataId, accessType: "write" }] });
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 47}),
                    ]);
                    await Promise.all([
                        dc().continueRequest({threadId: 0, singleThread: true}),
                        dc().assertStoppedLocation("breakpoint", { path: fibonacciFile(), line: 29}),
                    ]);

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
});