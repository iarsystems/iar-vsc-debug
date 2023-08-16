/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import { TestConfiguration } from "../testConfiguration";
import { debugAdapterSuite } from "./debugAdapterSuite";

debugAdapterSuite("Shows and sets variables", (dc, dbgConfig, fibonacciFile) => {
    const FIBS = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

    test("Shows variable values", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnSymbol = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().waitForEvent("stopped").then(async() => {
                // Locals are tested in other test cases
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});

                const statics = (await dc().variablesRequest({variablesReference: scopes.body.scopes[1]!.variablesReference})).body.variables;
                Assert(statics.length >= 9, "Expected at least 9 statics, found: " + statics.map(v => v.name).join(", "));
                { // Check string
                    const str = statics.find(variable => variable.name === "str <Fibonacci\\str>");
                    Assert(str, "Could not find str variable");
                    Assert.match(str.value, /"This is a sträng"$/);
                    Assert(str.type);
                    Assert.match(str.type, /char const \* @ 0x/);
                    Assert(str.evaluateName);
                    const evalResult = (await dc().evaluateRequest({expression: str.evaluateName})).body;
                    Assert.strictEqual(evalResult.result, str.value);
                    Assert.match(evalResult.type!, /char const \* @ 0x/);
                    Assert.strictEqual(evalResult.memoryReference, str.memoryReference);
                }

                { // Check array
                    const fibArray = statics.find(variable => variable.name === "Fib <Utilities\\Fib>");
                    Assert(fibArray !== undefined);
                    Assert.strictEqual(fibArray.value, "<array>");
                    Assert(fibArray.type !== undefined);
                    Assert.match(fibArray.type, /uint32_t\[10\] @ 0x/);
                    Assert(fibArray.variablesReference > 0); // Should be nested
                    const arrContents = (await dc().variablesRequest({variablesReference: fibArray.variablesReference})).body.variables;
                    Assert.strictEqual(arrContents.length, 10);
                    for (let i = 0; i < 10; i++) {
                        Assert.strictEqual(arrContents[i]!.name, `[${i}]`);
                        Assert.strictEqual(arrContents[i]!.value, FIBS[i]!.toString());
                        Assert.match(arrContents[i]!.type!, /uint32_t @ 0x/);
                        Assert(arrContents[i]!.evaluateName);
                        // DBUG-36 some older EWs can't eval typedef'd types well (like uint32_t), so only do this check
                        // when we're doing full tests with relatively modern EWs.
                        if (!TestConfiguration.getConfiguration().smokeTestsOnly) {
                            const evalResult = (await dc().evaluateRequest({expression: arrContents[i]!.evaluateName!})).body;
                            Assert.strictEqual(evalResult.result, arrContents[i]!.value);
                            Assert.strictEqual(BigInt(evalResult.memoryReference!), BigInt(arrContents[i]!.memoryReference!));
                        }
                    }
                }

                { // Check registers
                    const groups = (await dc().variablesRequest({variablesReference: scopes.body.scopes[2]!.variablesReference})).body.variables;
                    {
                        const cpuRegisters = groups.find(group => group.name === "Current CPU Registers" && group.variablesReference > 0);
                        Assert(cpuRegisters, "Found no register group called 'Current CPU Registers'");
                        const cpuRegContents = await dc().variablesRequest({variablesReference: cpuRegisters.variablesReference});

                        const registers = cpuRegContents.body.variables;
                        Assert(registers.some(reg => reg.name === "R4" || reg.name === "X4"));
                        Assert(registers.some(reg => reg.name === "SP"));
                        Assert(registers.some(reg => reg.name === "PC"));
                        Assert(registers.some(reg => (reg.name === "APSR" || reg.name === "PSTATE") && reg.variablesReference > 0)); // Should be nested

                    }
                    if (TestConfiguration.getConfiguration().hasFPU) {
                        const floatRegisters = groups.find(group => ["Floating-point Extension registers", "Floating-point registers"].includes(group.name) && group.variablesReference > 0);
                        Assert(floatRegisters, `Found no register group called 'Floating-point Extension registers' or 'Floating-point registers', found '${groups.map(g => g.name).join(", ")}'`);
                        const fpRegContents = await dc().variablesRequest({variablesReference: floatRegisters.variablesReference});

                        const registers = fpRegContents.body.variables;
                        Assert(registers.some(reg => reg.name.toLowerCase() === "s6" && reg.variablesReference > 0)); // Should be nested
                        Assert(registers.some(reg => reg.name.toLowerCase() === "d12"));
                    }
                }
            }),
        ]);
    });
    test("Supports deeply nested variables", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnSymbol = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});

                const statics = (await dc().variablesRequest({variablesReference: scopes.body.scopes[1]!.variablesReference})).body.variables;
                Assert(statics.length >= 9, "Expected at least 9 statics, found: " + statics.map(v => v.name).join(", "));
                { // Check nested struct
                    const nestedStruct = statics.find(variable => variable.name === "nested_struct <Fibonacci\\nested_struct>");
                    Assert(nestedStruct !== undefined);
                    Assert.strictEqual(nestedStruct.value, "<struct>");
                    Assert(nestedStruct.variablesReference > 0);
                    const nestedContents = (await dc().variablesRequest({variablesReference: nestedStruct.variablesReference})).body.variables;
                    Assert.strictEqual(nestedContents.length, 2);
                    { // Check second subvariable
                        const innerStruct = nestedContents.find(variable => variable.name === "inner");
                        Assert(innerStruct !== undefined);
                        Assert(innerStruct.variablesReference > 0);
                        const innerContents = (await dc().variablesRequest({variablesReference: innerStruct.variablesReference})).body.variables;
                        Assert.strictEqual(innerContents.length, 2);
                        const innerUnion = innerContents.find(variable => variable.name === "inner_inner");
                        Assert(innerUnion !== undefined);
                        Assert.strictEqual(innerUnion.value, "<union>");
                        const innerUnionContents = (await dc().variablesRequest({variablesReference: innerUnion.variablesReference})).body.variables;
                        Assert.strictEqual(innerUnionContents.length, 2);
                        const unionChar = innerUnionContents.find(variable => variable.name === "d");
                        Assert(unionChar !== undefined);
                        Assert.strictEqual(unionChar.value, "'\\0' (0x00)");
                        Assert(unionChar.type !== undefined);
                        Assert.match(unionChar.type, /char @ 0x/);
                    }
                    { // Check first subvariable
                        const innerUnion = nestedContents.find(variable => variable.name === "un");
                        Assert(innerUnion !== undefined);
                        Assert(innerUnion.variablesReference > 0);
                        const innerContents = (await dc().variablesRequest({variablesReference: innerUnion.variablesReference})).body.variables;
                        Assert.strictEqual(innerContents.length, 2);
                        const innerInt = innerContents.find(variable => variable.name === "a");
                        Assert(innerInt !== undefined);
                        Assert.strictEqual(innerInt.value, "42");
                        Assert(innerInt.type !== undefined);
                        Assert.match(innerInt.type, /int @ 0x/);
                    }
                    { // Check second subvariable again after expanding the first
                        const innerStruct = nestedContents.find(variable => variable.name === "inner");
                        Assert(innerStruct !== undefined);
                        Assert(innerStruct.variablesReference > 0);
                        const innerContents = (await dc().variablesRequest({variablesReference: innerStruct.variablesReference})).body.variables;
                        Assert.strictEqual(innerContents.length, 2);
                        const innerInt = innerContents.find(variable => variable.name === "e");
                        Assert(innerInt !== undefined);
                        Assert.strictEqual(innerInt.value, "0");
                        Assert(innerInt.type !== undefined);
                        Assert.match(innerInt.type, /int @ 0x/);
                    }
                }
                { // Check second nested struct, to make sure the adapter differentiates between them
                    const nestedStruct = statics.find(variable => variable.name === "nested_struct2 <Fibonacci\\nested_struct2>");
                    Assert(nestedStruct !== undefined);
                    Assert(nestedStruct.variablesReference > 0);
                    const nestedContents = (await dc().variablesRequest({variablesReference: nestedStruct.variablesReference})).body.variables;
                    const innerUnion = nestedContents.find(variable => variable.name === "un");
                    Assert(innerUnion !== undefined);
                    Assert(innerUnion.variablesReference > 0);
                    const innerContents = (await dc().variablesRequest({variablesReference: innerUnion.variablesReference})).body.variables;
                    Assert.strictEqual(innerContents.length, 2);
                    const innerInt = innerContents.find(variable => variable.name === "a");
                    Assert(innerInt !== undefined);
                    Assert.strictEqual(innerInt.value, "0");
                }
            }),
        ]);
    });
    test("Supports cyclic variables", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnSymbol = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});

                const statics = (await dc().variablesRequest({variablesReference: scopes.body.scopes[1]!.variablesReference})).body.variables;
                { // Check nested struct
                    const firstReference = statics.find(variable => variable.name === "references_self <Fibonacci\\references_self>");
                    Assert(firstReference !== undefined);
                    Assert.strictEqual(firstReference.value, "<struct>");
                    Assert(firstReference.variablesReference > 0);
                    const firstReferenceContents = (await dc().variablesRequest({variablesReference: firstReference.variablesReference})).body.variables;
                    Assert.strictEqual(firstReferenceContents.length, 2);
                    { // Check pointer to self
                        const secondReference = firstReferenceContents.find(variable => variable.name === "self");
                        Assert(secondReference !== undefined);
                        Assert.match(secondReference.value, /references_self \(0x/);
                        Assert(secondReference.variablesReference > 0);
                        const secondReferenceContents = (await dc().variablesRequest({variablesReference: secondReference.variablesReference})).body.variables;
                        Assert.strictEqual(secondReferenceContents.length, 2);
                        const thirdReference = secondReferenceContents.find(variable => variable.name === "self");
                        Assert.strictEqual(secondReference.value, thirdReference?.value);
                        Assert.strictEqual(secondReference.type, thirdReference?.type);
                        Assert.strictEqual(secondReference.memoryReference, thirdReference?.memoryReference);
                    }
                }
            }),
        ]);
    });

    test("Supports setting variable values", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                await dc().setBreakpointsRequest(
                    { source: { path: fibonacciFile() },
                        breakpoints: [{line: 38}] });
                await Promise.all([
                    dc().continueRequest({threadId: 0, singleThread: true}),
                    dc().waitForEvent("stopped"),
                ]);
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});

                // First set new values
                dc().setVariableRequest({name: "fib", value: "42", variablesReference: scopes.body.scopes[0]!.variablesReference});

                const staticsScope = scopes.body.scopes[1]!;
                {
                    const statics = (await dc().variablesRequest({variablesReference: staticsScope.variablesReference})).body.variables;
                    const nestedStruct = statics.find(variable => variable.name === "nested_struct <Fibonacci\\nested_struct>");
                    Assert(nestedStruct !== undefined);
                    Assert(nestedStruct.variablesReference > 0);
                    const nestedContents = (await dc().variablesRequest({variablesReference: nestedStruct.variablesReference})).body.variables;
                    const innerUnion = nestedContents.find(variable => variable.name === "un");
                    Assert(innerUnion !== undefined);
                    Assert(innerUnion.variablesReference > 0);
                    await dc().setVariableRequest({ name: "a", value: "0x41", variablesReference: innerUnion.variablesReference});
                }
                {
                    // Setting eval'd variables uses different code, so test it too
                    const fibArray = (await dc().evaluateRequest({expression: "Fib"})).body;
                    Assert(fibArray !== undefined);
                    Assert(fibArray.variablesReference > 0);
                    await dc().setVariableRequest({ name: "[9]", value: "37", variablesReference: fibArray.variablesReference});
                    await dc().customRequest("setExpression", { expression: "callCount", value: "42" });
                }

                // Now check that the values changed
                const locals = (await dc().variablesRequest({variablesReference: scopes.body.scopes[0]!.variablesReference})).body.variables;
                Assert(locals.some(variable => variable.name === "fib" && variable.value === "42" && variable.type?.match(/uint32_t volatile @ 0x/)), JSON.stringify(locals));
                const statics = (await dc().variablesRequest({variablesReference: staticsScope.variablesReference})).body.variables;
                {
                    const nestedStruct = statics.find(variable => variable.name === "nested_struct <Fibonacci\\nested_struct>");
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
                    Assert.strictEqual(innerChar.value, "'A' (0x41)");
                    Assert(innerChar.type !== undefined);
                    Assert.match(innerChar.type, /char @ 0x/);

                    const fibArray = statics.find(variable => variable.name === "Fib <Utilities\\Fib>");
                    Assert(fibArray !== undefined);
                    Assert(fibArray.variablesReference > 0);
                    const arrContents = (await dc().variablesRequest({variablesReference: fibArray.variablesReference})).body.variables;
                    Assert.strictEqual(arrContents[9]!.name, "[9]");
                    Assert.strictEqual(arrContents[9]!.value, "37");

                    const callCount = statics.find(variable => variable.name === "callCount <Fibonacci\\callCount>");
                    Assert(callCount !== undefined);
                }
            })
        ]);
    });

    test("Supports setting register values", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});
                const registersScope = scopes.body.scopes[2]!;
                const registerGroups = (await dc().variablesRequest({ variablesReference: registersScope.variablesReference })).body.variables;
                const cpuRegisters = registerGroups.find(group => group.name === "Current CPU Registers");
                Assert(cpuRegisters);

                const isAArch64 = registerGroups.some(group => group.name.startsWith("AArch64"));
                // First set new values
                const regName =  isAArch64 ? "X8" : "R8";
                const regVal = isAArch64 ?  "0xDEADBEEFDEADBEEF" : "0xDEADBEEF";
                dc().setVariableRequest({name: regName, value: regVal, variablesReference: cpuRegisters.variablesReference});
                const statusRegName = isAArch64 ? "PSTATE" : "APSR";
                {
                    const regs = (await dc().variablesRequest({variablesReference: cpuRegisters.variablesReference})).body.variables;
                    const statusReg = regs.find(reg => reg.name === statusRegName);
                    Assert(statusReg !== undefined);
                    Assert(statusReg.variablesReference > 0);
                    const res = await dc().setVariableRequest({ name: "V", value: "0b1", variablesReference: statusReg.variablesReference});
                    Assert.strictEqual(res.body.value, "1");
                }

                // Now check that the values changed
                const regs = (await dc().variablesRequest({variablesReference: cpuRegisters.variablesReference})).body.variables;
                Assert(regs.some(reg => reg.name === regName && reg.value.replace(/'/g, "") === regVal.toLowerCase()), JSON.stringify(regs));
                {
                    const statusReg = regs.find(reg => reg.name === statusRegName);
                    Assert(statusReg !== undefined);
                    Assert(statusReg.variablesReference > 0);
                    const apsrContents = (await dc().variablesRequest({variablesReference: statusReg.variablesReference})).body.variables;
                    const v = apsrContents.find(reg => reg.name === "V");
                    Assert(v !== undefined);
                    Assert.strictEqual(v.value, "1");
                }
            })
        ]);
    });

    // The specification is a bit iffy, but it seems pointers should use their value as memoryReference,
    // rather than the address of the pointer itself.
    test("Pointer memoryReference uses value", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnSymbol = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});
                const staticsScope = scopes.body.scopes[1]!;

                const vars = await dc().variablesRequest({ variablesReference: staticsScope.variablesReference });
                const pointer = vars.body.variables.find(variable => variable.name.startsWith("pointer"));
                Assert(pointer);
                Assert(pointer.memoryReference);
                Assert.match(pointer.memoryReference, /0x0*1337/);
            })
        ]);
    });

    test("Marks read-only variables as read-only", () => {
        return Promise.all([
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const stack = await dc().stackTraceRequest({ threadId: 0});
                const scopes = await dc().scopesRequest({frameId: stack.body.stackFrames[0]!.id});

                const staticsScope = scopes.body.scopes[1]!;
                const statics = (await dc().variablesRequest({variablesReference: staticsScope.variablesReference})).body.variables;
                const fibArray= statics.find(variable => variable.name === "Fib <Utilities\\Fib>");
                Assert(fibArray !== undefined);
                Assert(fibArray.variablesReference > 0);
                Assert(fibArray.presentationHint?.attributes?.includes("readOnly"));
            })
        ]);
    });
});