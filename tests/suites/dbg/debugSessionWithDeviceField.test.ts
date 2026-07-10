/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import * as vscode from "vscode";
import { TestUtils } from "../testUtils";
import { TestConfiguration } from "../testConfiguration";
import { WorkbenchFeatures } from "iar-vsc-common/workbenchfeatureregistry";
import { Workbench } from "iar-vsc-common/workbench";

/**
 * Like debugSession.test.ts, but uses a device name instead of driverOptions,
 * relying on C-SPY's LaunchConfiguration to resolve the driver settings.
 * Skipped unless the workbench supports WorkbenchFeatures.Device.
 */
suite("Debug session with setting the device field", () => {

    let dbgConfig: vscode.DebugConfiguration;
    let activeSession: vscode.DebugSession;
    let testConfiguration: TestConfiguration;

    vscode.debug.onDidStartDebugSession(session => {
        activeSession = session;
    });

    suiteSetup(async function() {
        this.timeout(40000);

        const ewPath = TestUtils.getEwPath();
        Assert.ok(ewPath !== undefined, "No workbench found");
        const workbench = Workbench.create(ewPath);
        Assert.ok(workbench !== undefined, "Could not create workbench");

        // Only run this test if:
        // 1. The workbench supports setting the device
        // 2. The set test configuration is ARM using Simulator as driver.
        const setDebugConfiguration = TestConfiguration.getConfiguration().debugConfiguration;
        if (setDebugConfiguration.target !== "arm" || setDebugConfiguration.driver !== "Simulator" || !WorkbenchFeatures.supportsFeature(workbench, WorkbenchFeatures.Device, "arm")) {
            this.skip();
        }

        Assert.ok(TestConfiguration.TEST_CONFIGURATIONS["armSim2Device"] !== undefined);
        testConfiguration = TestConfiguration.TEST_CONFIGURATIONS["armSim2Device"];
        dbgConfig = await TestUtils.doSetup(testConfiguration);
    });

    setup(async function() {
        console.log("\n==========================================================" + this.currentTest!.title + "==========================================================\n");
        await vscode.debug.startDebugging(undefined, dbgConfig);
        await TestUtils.wait(4000);
    });

    teardown(async() => {
        await vscode.debug.stopDebugging(activeSession);
        await TestUtils.wait(2000);
    });

    test("Test launch", async() => {
        const startLine = testConfiguration.stopsAfterMain ? 45 : 43;
        const column = testConfiguration.stopsAfterMain ? 3 : 1;
        await TestUtils.assertCurrentLineIs(activeSession, "", startLine, column);
    });

    test("Test step", async() => {
        const startLine = testConfiguration.stopsAfterMain ? 45 : 43;
        const column = testConfiguration.stopsAfterMain ? 3 : 1;
        await TestUtils.assertCurrentLineIs(activeSession, "", startLine, column);
        await activeSession.customRequest("next", { granularity: "" });
        await TestUtils.wait(1000);
        await TestUtils.assertCurrentLineIs(activeSession, "", startLine + 2, 3);
    });
});
