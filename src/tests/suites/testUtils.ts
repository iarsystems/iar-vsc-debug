

import assert = require("assert")
import * as vscode from "vscode";
import * as Path from "path";
import { IarOsUtils } from "../../utils/osUtils";
import { spawnSync } from "child_process";
import { TestSandbox } from "../../utils/testutils/testSandbox";
import { CSpyLaunchRequestArguments } from "../../dap/cspyDebug";

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
        const sandbox = new TestSandbox(PROJECT_ROOT);
        let targetProject = Path.join(TestUtils.PROJECT_ROOT, "src/tests/TestProjects/GettingStarted/BasicDebugging.ewp");
        if (process.env["test-project"]) {
            console.log("Using project: " + process.env["test-project"]);
            targetProject = process.env["test-project"];
        }
        const projectDir = sandbox.copyToSandbox(Path.dirname(targetProject));
        const project = Path.join(projectDir, Path.basename(targetProject));
        let config = "Debug";
        if (process.env["test-config"]) {
            console.log("Using configuration: " + process.env["test-config"]);
            config = process.env["test-config"];
        }
        buildProject(workbenchPath, project, config);

        const launchConfig: vscode.DebugConfiguration = JSON.parse(JSON.stringify(defaultConfig));
        return {
            ...launchConfig,
            projectPath: project,
            projectConfiguration: config,
            program: Path.join(Path.dirname(project), config, "Exe", Path.basename(project, ".ewp") + ".out"),
            workbenchPath: workbenchPath
        };
    }

    // Gets a list of paths to available ews, either from user settings or from an env variable set by the test runner
    export function getEwPaths() {
        const installDirs = vscode.workspace.getConfiguration("iarvsc").get<string[]>("iarInstallDirectories");
        if (installDirs) {
            return installDirs;
        }
        return JSON.parse(process.env["ewPaths"] || "[]");
    }

    export function assertCurrentLineIs(session: vscode.DebugSession, _path: string, line: number, column: number) {
        return session.customRequest("stackTrace").then((response)=>{
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

    function buildProject(workbenchPath: string, ewpPath: string, configuration: string) {
        const iarBuildPath = Path.join(workbenchPath, "common/bin/iarbuild" + IarOsUtils.executableExtension());
        console.log("Building " + ewpPath);
        const exitCode = spawnSync(iarBuildPath, [ewpPath, "-build", configuration]).status;
        if (exitCode !== 0) {
            throw new Error("Failed building test project, iarbuild gave: " + exitCode);
        }
        // console.log(spawnSync(iarBuildPath, [ewpPath, "-build", configuration]).stdout.toString());
    }


    const defaultConfig: vscode.DebugConfiguration = {
        type: "cspy",
        request: "launch",
        name: "C-SPY Debugging Tests",
        driverLib: "armsim2",
        driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting", "--multicore_nr_of_cores=1"],
        stopOnEntry:true
    };
}