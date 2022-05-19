/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import { debugAdapterSuite } from "./debugAdapterSuite";
import { TestUtils } from "../testUtils";

debugAdapterSuite("Stepping", (dc, dbgConfig, fibonacciFile, utilsFile) => {

    test("Supports stepping", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                for (let i = 0; i < 4; i++) {
                    await Promise.all([
                        dc().nextRequest({threadId: 1}),
                        TestUtils.assertStoppedLocation(dc(), "step", 45 + i*2,
                            fibonacciFile(), /main/),
                    ]);
                }
                await Promise.all([
                    dc().stepInRequest({threadId: 1}),
                    TestUtils.assertStoppedLocation(dc(), "step", 35, fibonacciFile(), /DoForegroundProcess/)
                ]);
                await dc().setBreakpointsRequest({ source: { path: utilsFile() },
                    breakpoints: [{line: 54}] });
                await Promise.all([
                    dc().continueRequest({threadId: 1}),
                    TestUtils.assertStoppedLocation(dc(), "breakpoint", 54, utilsFile(), /PutFib/).then(async() => {
                        const stack = (await dc().stackTraceRequest({threadId: 1})).body.stackFrames;
                        Assert(stack.length >= 3);
                        Assert.strictEqual(stack[1]!.name, "DoForegroundProcess");
                        Assert.strictEqual(stack[1]!.line, 38);
                        Assert.strictEqual(stack[1]!.source?.path, fibonacciFile());

                        const res = await dc().scopesRequest({frameId: stack[1]!.id});
                        const vars = (await dc().variablesRequest({variablesReference: res.body.scopes[0]!.variablesReference})).body.variables;
                        Assert.strictEqual(vars.length, 1);
                        Assert.strictEqual(vars[0]!.name, "fib");
                        Assert(vars[0]!.value === "<unavailable>" || vars[0]!.value === "1");
                    })
                ]);
            })
        ]);
    });
    test("Supports instruction stepping", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().hitBreakpoint(
                dbgConfigCopy,
                { line: 26, path: utilsFile() }
            ).then(async() => {
                await Promise.all([
                    dc().nextRequest({threadId: 1, granularity: "instruction"}),
                    TestUtils.assertStoppedLocation(dc(), "step", 26,
                        utilsFile(), /InitFib/),
                ]);
                await Promise.all([
                    dc().stepOutRequest({threadId: 1, granularity: "instruction"}),
                    TestUtils.assertStoppedLocation(dc(), "step", 49,
                        fibonacciFile(), /main/),
                ]);
            })
        ]);
    });

    test("Variables change when stepping", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().hitBreakpoint(
                dbgConfigCopy,
                { line: 37, path: fibonacciFile() }
            ).then(async() => {
                let scopes = await dc().scopesRequest({frameId: 0});
                let locals = (await dc().variablesRequest({variablesReference: scopes.body.scopes[0]!.variablesReference})).body.variables;
                Assert.strictEqual(locals.length, 1);
                Assert.strictEqual(locals[0]!.name, "fib");
                Assert(["0", "<unavailable>"].includes(locals[0]!.value), "Value was: " + locals[0]!.value);

                await Promise.all([ dc().nextRequest({threadId: 0}), dc().waitForEvent("stopped") ]);

                scopes = await dc().scopesRequest({frameId: 0});
                locals = (await dc().variablesRequest({variablesReference: scopes.body.scopes[0]!.variablesReference})).body.variables;
                Assert.strictEqual(locals.length, 1);
                Assert(locals.some(variable => variable.name === "fib" && variable.value === "1" && variable.type?.match(/uint32_t volatile @ 0x/)));
            }),
        ]);
    });

    test("Supports restarting", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                await Promise.all([
                    dc().restartRequest({}),
                    TestUtils.assertStoppedLocation(dc(), "entry", 43, fibonacciFile(), /main/),
                ]);

            }),
        ]);
    });

});