/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { LaunchArgumentConfigurationResolver } from "../../../src/dap/configresolution/launchArgumentConfigurationResolver";
import { CSpyLaunchRequestArguments } from "../../../src/dap/cspyDebug";
import * as assert from "assert";
import * as path from "path";
import { OsUtils } from "iar-vsc-common/osUtils";
import { TestUtils } from "../testUtils";
import { BreakpointType } from "../../../src/dap/breakpoints/cspyBreakpointManager";

suite("Configuration resolution tests", () => {

    const argRes: LaunchArgumentConfigurationResolver = new LaunchArgumentConfigurationResolver();
    let cspyArgs: CSpyLaunchRequestArguments;

    // We need a dummy path that exists
    const existantDir: string = path.resolve(__dirname);
    // .. and a dummy file that exitsts
    const existantFile: string = path.resolve(__filename);
    // The workbench to use.
    let workbench: string;

    function getLibName(libBaseName: string) {
        let libname: string;
        if (OsUtils.detectOsType() === OsUtils.OsType.Linux) {
            libname =  `lib${libBaseName}.so`;
        } else {
            libname = `${libBaseName}.dll`;
        }
        return path.join(workbench, cspyArgs["target"], "bin", libname);
    }

    suiteSetup(() => {
        // Find a workbench to build with
        const installDirs = TestUtils.getEwPaths();
        assert(installDirs[0], "No workbench found to use for debugging");
        // For now just use the first entry, and assume it points directly to a top-level ew directory
        workbench = installDirs[0];
    });

    setup(()=>{
        // Setup a basic set of arguments to use during the test.
        cspyArgs = {
            target: "arm",
            program: existantFile,
            stopOnSymbol: "main",
            breakpointType: BreakpointType.AUTO,
            trace: true,
            workbenchPath: workbench,
            projectPath: existantDir,
            projectConfiguration: "Debug",
            driver: "jet",
            driverOptions: ["some", "options"],
            setupMacros: []
        };

    });

    test("Test partial resolver", async() => {
        await argRes.resolveLaunchArgumentsPartial(cspyArgs).then(
            (config)=>{
                assert.deepStrictEqual(config["driverFile"].toLowerCase(), getLibName("armjet").toLowerCase(), "Wrong driver lib");
                assert.deepStrictEqual(config["processorName"].toLowerCase(), getLibName("armproc").toLowerCase(), "Wrong processor");
                assert.deepStrictEqual(config["options"], ["--backend", "some", "options"], "Wrong driver args");
            }, ()=>{
                assert.fail("Failed to resolve arguments");
            }
        );
    });

    test("Test project path resolver", async() => {
        // Test when running using a directory as project directory.
        await argRes.resolveLaunchArguments(cspyArgs).then((config)=>{
            assert.deepStrictEqual(config["projectName"], path.basename(existantDir), "Wrong project name");
            assert.deepStrictEqual(config["projectDir"], path.join(existantDir, ".vscode"), "Wrong project directory");
            const plugins = config["plugins"];
            assert.deepStrictEqual(plugins[plugins.length - 1], getLibName("armLibSupportEclipse"), "LibSupportEclipse is missing");
        }, ()=>{
            assert.fail("Failed to resolve arguments");
        });

        // Test when running using a file as projectDir
        cspyArgs["projectPath"] = existantFile;
        await argRes.resolveLaunchArguments(cspyArgs).then((config)=>{
            assert.deepStrictEqual(config["projectName"], path.basename(existantFile), "Wrong project name");
            assert.deepStrictEqual(config["projectDir"], path.join(path.parse(existantFile).dir, ".vscode"), "Wrong project directory");
        }, ()=>{
            assert.fail("Failed to resolve arguments");
        });
    });

    test("Test non-existant value", () => {
        // Test the program
        cspyArgs["program"] = "foo";
        argRes.resolveLaunchArguments(cspyArgs).then(()=>{
            assert.fail("Should fail if program does not exist");
        });
        cspyArgs["program"] = existantFile;

        // Test the project path.
        cspyArgs["projectPath"] = "foo";
        argRes.resolveLaunchArguments(cspyArgs).then(()=>{
            assert.fail("Should fail if project path does not exist");
        });
        cspyArgs["projectPath"] = existantDir;

        // Test the workbench path.
        cspyArgs["workbenchPath"] = "foo";
        argRes.resolveLaunchArguments(cspyArgs).then(()=>{
            assert.fail("Should fail if workbench does not exist");
        });
    });

});