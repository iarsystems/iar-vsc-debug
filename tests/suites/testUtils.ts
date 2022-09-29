/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import assert = require("assert")
import * as vscode from "vscode";
import * as Path from "path";
import { IarOsUtils } from "iar-vsc-common/osUtils";
import { spawnSync } from "child_process";
import { TestSandbox } from "iar-vsc-common/testutils/testSandbox";
import { CSpyLaunchRequestArguments } from "../../src/dap/cspyDebug";
import { TestConfiguration } from "./testConfiguration";
import { DebugClient } from "@vscode/debugadapter-testsupport";

/**
 *  Class contaning utility methods for the tests.
 */
export namespace TestUtils {
    export const PROJECT_ROOT = Path.join(__dirname, "../../../");

    /**
     * Performs setup common to all test suites. Should be called before each suite
     * * Determines the project & config to use
     * * Determines the driver and driver arguments to use
     * * Builds the project
     * * Returns a launch config using the determined project and driver
     */
    export function doSetup(workbenchPath: string): vscode.DebugConfiguration & CSpyLaunchRequestArguments {
        const parameters = TestConfiguration.getConfiguration();

        let program: string;
        let projectDir: string;
        let configuration: string;

        if (parameters.testProgram.variant === "doBuild") {
            const targetProject = parameters.testProgram.project;
            const sandbox = new TestSandbox(PROJECT_ROOT);
            projectDir = sandbox.copyToSandbox(Path.dirname(targetProject));
            const project = Path.join(projectDir, Path.basename(targetProject));
            configuration = parameters.testProgram.projectConfiguration;
            program = Path.join(Path.dirname(project), configuration, "Exe", Path.basename(project, ".ewp") + ".out");
            buildProject(workbenchPath, project, configuration);
        } else { // use a prebuilt binary
            projectDir = parameters.testProgram.sourceDir;
            program = parameters.testProgram.binaryPath;
            configuration = "Debug"; // just make something up
        }
        return {
            type: "cspy",
            request: "launch",
            name: "C-SPY Debugging Tests",
            ...parameters.debugConfiguration,
            stopOnEntry: true,
            projectPath: projectDir,
            projectConfiguration: configuration,
            program: program,
            workbenchPath: workbenchPath,
        };
    }

    // Gets a list of paths to available ews, either from user settings or from an env variable set by the test runner
    export function getEwPaths(): string[] {
        if (process.env["ewPaths"]) {
            return JSON.parse(process.env["ewPaths"]);
        }
        const installDirs = vscode.workspace.getConfiguration("iar-build").get<string[]>("iarInstallDirectories");
        if (installDirs) {
            return installDirs;
        }
        return [];
    }

    export function assertCurrentLineIs(session: vscode.DebugSession, _path: string, line: number, column: number) {
        return session.customRequest("stackTrace", { threadId: 0 }).then((response)=>{
            console.log("Checking stack");
            if (response.stackFrames) {
                const currentStack = response.stackFrames[0];
                assert.strictEqual(currentStack.line, line, `Wrong line: expected ${line} got ${currentStack.line}`);
                assert.strictEqual(currentStack.column, column, `Wrong column: expected ${column} got ${currentStack.column}`);
            }
        });
    }

    export function wait(time: number) {
        return new Promise((resolve, _) => {
            setTimeout(resolve, time);
        });
    }

    export function assertStoppedLocation(dc: DebugClient, reason: string, line: number, file: string | undefined, name: RegExp, threadId = 0) {
        return dc.waitForEvent("stopped").then(event => {
            assert.strictEqual(event.body?.reason, reason);
            return assertLocationIs(dc, line, file, name, threadId);
        });
    }
    export async function assertLocationIs(dc: DebugClient, line: number, file: string | undefined, name: RegExp, threadId = 0) {
        const stack = await dc.stackTraceRequest({threadId});
        const topStack = stack.body.stackFrames[0];
        assert(topStack);
        assert.match(topStack.name, name);
        assert.strictEqual(topStack.source?.path, file);
        assert.strictEqual(topStack.line, line);
    }

    export function buildProject(workbenchPath: string, ewpPath: string, configuration: string) {
        const iarBuildPath = Path.join(workbenchPath, "common/bin/iarbuild" + IarOsUtils.executableExtension());
        console.log("Building " + ewpPath);
        const proc = spawnSync(iarBuildPath, [ewpPath, "-build", configuration]);
        if (proc.status !== 0) {
            throw new Error(`Failed building test project (code ${proc.status}), iarbuild output: ${proc.stdout.toString()}`);
        }
    }
}
