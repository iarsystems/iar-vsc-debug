/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { TestUtils } from "../testUtils";


/**
 * Tests against a full debug session started from vs code.
 * Testing this way is a bit clumsy, since there are limits to what information we can
 * probe for from the vs code api. For example, after stepping or running, we can't know
 * when the debugger has stopped again, we instead just have to wait.
 *
 * An improvement would be to have the debug adapter support multiple clients at the
 * same time. Then we could have vs code connect to it, and also have a DebugClient
 * instance to use for e.g. waiting for events. However, the debug adapter currently only
 * supports having one client at a time.
 */
suite("New tests", () =>{

    let dbgConfig: vscode.DebugConfiguration;

    let activeSession: vscode.DebugSession;

    vscode.debug.onDidStartDebugSession((session)=>{
        activeSession = session;
    });

    suiteSetup(() => {
        dbgConfig = TestUtils.doSetup();
    });

    setup(async function() {
        console.log("\n==========================================================" + this.currentTest!.title + "==========================================================\n");
        await vscode.debug.startDebugging(undefined, dbgConfig);
        await TestUtils.wait(4000);

    });

    teardown(async()=>{
        await vscode.debug.stopDebugging(activeSession);
        await TestUtils.wait(2000);
    });

    test("Test launch", async()=>{
        await TestUtils.assertCurrentLineIs(activeSession, "", 43, 1);
    });


    test("Test step", async()=>{
        await TestUtils.assertCurrentLineIs(activeSession, "", 43, 1);
        await activeSession.customRequest("next", {granularity: ""});
        await TestUtils.wait(1000);
        await TestUtils.assertCurrentLineIs(activeSession, "", 45, 3);
    });

});