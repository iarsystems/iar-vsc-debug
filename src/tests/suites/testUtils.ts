import assert = require("assert")
import * as vscode from "vscode";
import * as Path from "path";
import { IarOsUtils } from "../../utils/osUtils";
import { spawnSync } from "child_process";
import { TestSandbox } from "../../utils/testutils/testSandbox";
import { CSpyLaunchRequestArguments } from "../../dap/cspyDebug";
import { BreakpointType } from "../../dap/breakpoints/cspyBreakpointManager";
import { XclConfigurationProvider } from "../../configresolution/xclConfigurationProvider";

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
        const config = "Debug";

        // If overriding program, the user is responsible for having built it. Otherwise we build it ourselves.
        if (process.env["cspybat-args"] && process.env["source-dir"]) {
            // split on unescaped whitespace
            const args = process.env["cspybat-args"].split(/(?<!\\)\s+/g);
            const backendIdx = args.indexOf("--backend");
            const launchConfig = XclConfigurationProvider.generateDebugConfiguration(
                "", "", "",
                config,
                args.slice(0, backendIdx),
                args.slice(backendIdx+1));

            if (launchConfig === undefined) {
                throw new Error("Unable to create launch config from cspybat cmdline. Check its validity.");
            }
            launchConfig["workbenchPath"] = workbenchPath;
            launchConfig["stopOnEntry"] = defaultConfig.stopOnEntry;
            launchConfig["projectPath"] = process.env["source-dir"];
            return launchConfig as vscode.DebugConfiguration & CSpyLaunchRequestArguments;
        } else {
            const targetProject = Path.join(TestUtils.PROJECT_ROOT, "src/tests/TestProjects/GettingStarted/BasicDebugging.ewp");
            const sandbox = new TestSandbox(PROJECT_ROOT);
            const projectDir = sandbox.copyToSandbox(Path.dirname(targetProject));
            const project = Path.join(projectDir, Path.basename(targetProject));
            const program = Path.join(Path.dirname(project), config, "Exe", Path.basename(project, ".ewp") + ".out");
            buildProject(workbenchPath, project, config);
            return {
                ...defaultConfig,
                projectPath: project,
                projectConfiguration: config,
                program: program,
                workbenchPath: workbenchPath,
                breakpointType: BreakpointType.AUTO
            };
        }
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
        const proc = spawnSync(iarBuildPath, [ewpPath, "-build", configuration]);
        if (proc.status !== 0) {
            throw new Error(`Failed building test project (code ${proc.status}), iarbuild output: ${proc.stdout.toString()}`);
        }
    }

    const defaultConfig = {
        type: "cspy",
        request: "launch",
        name: "C-SPY Debugging Tests",
        target: "arm",
        driver: "armsim2",
        driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting", "--multicore_nr_of_cores=1"],
        stopOnEntry:true
    };
}
