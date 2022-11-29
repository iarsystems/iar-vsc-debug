/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { TestUtils } from "../testUtils";
import * as Assert from "assert";
import * as Path from "path";
import * as Fs from "fs";
import { ChildProcess, spawn } from "child_process";
import * as vscode from "vscode";
import { CSpyLaunchRequestArguments } from "../../../src/dap/cspyDebug";
import { DebugClient } from "@vscode/debugadapter-testsupport";
import { DebugProtocol } from "@vscode/debugprotocol";

export const ADAPTER_PORT = 4711;

/**
 * A function describing the tests to run in a {@link debugAdapterSuite}. The runner is provided a few parameters by the suite:
 *      - A client to a debug adapter, that should be used to send & receive requests
 *      - The debug configuration to use when launch sessions from the debug client
 *      - Paths to the two source files, to compare against the paths returned by the debugger
 *   Note that the parameters are provided as function so that they can be read lazily; they are only safe to call
 *   from inside mocha functions (i.e. after suiteSetup has run).
 */
type DebugAdapterSuiteRunner = (
    dc: () => DebugClient,
    dbgConfig: () => Readonly<vscode.DebugConfiguration & CSpyLaunchRequestArguments>,
    fibonacciFile: () => string, // the Fibonacci.c source file
    utilsFile: () => string, // the Utilities.c source file
) => void;

/**
 * Provides setup and teardown common to all suites that rely on communicating with a debug adapter (i.e. a real session).
 * Sets up the a debug adapter and debug configuration according to the current test configuration (see {@link TestConfiguration}).
 *
 * This function is meant to imitate the regular `suite` mocha function that you would otherwise use.
 * @param title The title of the suite
 * @param runner The function describing the tests to run. See {@link DebugAdapterSuiteRunner}.
 */
export function debugAdapterSuite(title: string, runner: DebugAdapterSuiteRunner) {
    suite(title, function() {
        let dbgConfig: (vscode.DebugConfiguration & CSpyLaunchRequestArguments) | undefined;
        let dc: DebugClient | undefined;
        let debugAdapter: ChildProcess;

        let fibonacciFile = "";
        let utilsFile = "";

        suiteSetup(async function() {
            // Find a workbench to build with
            const installDirs = TestUtils.getEwPaths();
            // For now just use the first entry, and assume it points directly to a top-level ew directory
            const workbench = installDirs[0];
            Assert(workbench, "No workbench found to use for debugging");

            dbgConfig = TestUtils.doSetup(workbench);
            fibonacciFile = Path.join(dbgConfig.projectPath!, "Fibonacci.c");
            utilsFile = Path.join(dbgConfig.projectPath!, "Utilities.c");

            const theDebugger = Path.join(__dirname, "../../../src/dap/debugAdapter.js");
            if (!Fs.existsSync(theDebugger)) {
                Assert.fail("No debugger is available.");
            }

            // For some reason DebugClient isnt able to start the adapter itself, so start it manually as a tcp server
            debugAdapter = spawn("node", [Path.join(__dirname, "../../../src/dap/debugAdapter.js"), `--server=${ADAPTER_PORT}`]);
            debugAdapter.stdout?.on("data", dat => {
                console.log("OUT: " + dat.toString().replace(/^\s+|\s+$/g, ""));
            });
            debugAdapter.stderr?.on("data", dat => {
                console.log("ERR: " + dat.toString().replace(/^\s+|\s+$/g, ""));
            });
            // Need to wait a bit for the adapter to start
            await TestUtils.wait(4000);

        });
        suiteTeardown(() => {
            debugAdapter.kill();
        });

        setup(async function() {
            console.log("\n==========================================================" + this.currentTest!.title + "==========================================================\n");
            dc = new DebugClient("node", "", "cspy");
            dc.on("output", ev => {
                console.log("CONSOLE OUT: " + ev.body.output.replace(/^\s+|\s+$/g, ""));
            });
            // The test program requests terminal input, we always respond with this.
            dc.on("output", (ev: DebugProtocol.OutputEvent) => {
                if (ev.body.output.startsWith("Debugee requested terminal input")) {
                    dc!.evaluateRequest({ expression: "1234\nhello", context: "repl" });
                }
            });
            await dc.start(ADAPTER_PORT);
        });
        teardown(function() {
            this.timeout(20000);
            // Stop the debug adapter.
            // A real timeout here will cause the entire suite to abort so we implement our own timeout
            // with Mocha.Runnable.emit(), which doesn't cause an abort but still reports an error.
            let done = false;
            return Promise.race([
                // The debug adapter needs some time after stopping to be ready for new connections
                dc!.stop().then(() => {
                    done = true; return TestUtils.wait(1500);
                }),
                TestUtils.wait(18000).then(() => {
                    if (!done) {
                        this.test?.emit("error", new Error("Timed out waiting for adapter to exit"));
                    }
                }),
            ]);
        });

        runner(() => dc!, () => dbgConfig!, () => fibonacciFile, () => utilsFile);
    });
}