/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import { DefaultCSpyConfigurationResolver, CSpyConfigurationsProvider } from "../../../src/configproviders/cspyConfigurationProviders";
import { OsUtils } from "iar-vsc-common/osUtils";
import { XclConfigurationSupplier } from "../../../src/configproviders/supplier/xclConfigurationSupplier";
import { ConfigResolutionCommon } from "../../../src/configproviders/supplier/common";
import { BuildExtensionConfigurationProvider } from "../../../src/configproviders/supplier/buildExtensionConfigurationSupplier";
import { CSpyConfigurationSupplier } from "../../../src/configproviders/supplier/supplier";

/**
 * This test suite tests our ability to generate a launch configuration based on the xcl files
 * and their content.
 * As such, the testsuite as a whole will test the concept as it can split into minor segments.
 */
suite("Configuration tests", () => {

    // The current workspace.
    let rootFolder: vscode.WorkspaceFolder;

    suiteSetup(() => {
        // Start by setting loading the current workspace.
        const folders = vscode.workspace.workspaceFolders;
        console.log(folders);
        if (!folders || !folders[0]) {
            assert.fail("Failed to located the current workspace.");
        }
        rootFolder = folders[0];

        // Create a mock build extension api with test values
        CSpyConfigurationSupplier.setMockApi({
            getSelectedProject() {
                return Promise.resolve(path.join(rootFolder.uri.fsPath, "BasicDebugging.ewp"));
            },
            getSelectedWorkbench() {
                return Promise.resolve(undefined);
            },
            getSelectedConfiguration() {
                return Promise.resolve({name: "Debug", target: "ARM"});
            },
            getProjectConfigurations() {
                return Promise.reject(new Error());
            },
            getCSpyCommandline() {
                return Promise.resolve(undefined);
            }
        });
    });

    /**
 	* Test the path splitter is able to work with different types of paths.
 	*/
    test("Test path splitter", () => {
        const varsToTest: Map<string, string[]> = new Map();

        varsToTest.set("C:\\my\\path\\to \\somewhere", ["C:", "my", "path", "to ", "somewhere"]);
        varsToTest.set("/home/myPath//here//file.c", ["home", "myPath", "here", "file.c"]);
        varsToTest.set("X:\\foo//bar", ["X:", "foo", "bar"]);

        varsToTest.forEach((value, key) => {
            const res = OsUtils.splitPath(key);
            const noSegments = res.length;
            assert.strictEqual(noSegments, value.length, "To few arguments for " + key);

            for (let i = 0; i < noSegments; i++) {
                assert.strictEqual(res[i], value[i], `Expected ${value[i]} got ${res[i]}`);
            }
        });

    });

    /**
	 * Test that we're able to list all available launches based on the content of the
	 * settings folder.
	 */
    test("Test dynamic configurations", async() => {
        const cspyConfigs = await new CSpyConfigurationsProvider().provideDebugConfigurations(rootFolder);
        if (!cspyConfigs) {
            assert.fail("Failed to generate a configuration");
        }

        assert.deepStrictEqual(cspyConfigs?.length, 2, "Should have found two configurations");
        const configsToFind = ["Release", "Debug"];

        // Make sure that all the expected configuration are found.
        configsToFind.forEach((config)=>{
            let found = false;
            cspyConfigs.forEach(cspyConfig=>{
                if (cspyConfig["name"] === ("BasicDebugging." + config)) {
                    found = true;
                }
            });
            assert.deepStrictEqual(true, found, "Failed to find configuration " + config);
        });
    });

    /**
	 * Test that we're able to read the content of the vsc file and select the appropriate configuration.
	 */
    test("Test initial configurations", async() => {
        const dummyConfig: any = {};
        const cspyConfig = await new DefaultCSpyConfigurationResolver().resolveDebugConfiguration(rootFolder, dummyConfig, undefined);

        if (!cspyConfig || cspyConfig === null) {
            assert.fail("Failed to generate a configuration");
        }

        // Check that we've collected the correct information for the project
        assert.deepStrictEqual(cspyConfig["name"], "BasicDebugging.Debug");
        assert.deepStrictEqual(cspyConfig["type"], "cspy");
        assert.deepStrictEqual(cspyConfig["projectConfiguration"], "Debug");
        assert.deepStrictEqual(cspyConfig["driver"], "Simulator");
        assert.deepStrictEqual(cspyConfig["target"], "arm");
    });

    /**
	 * Test that we're able to handle a series of command lines
	 * intended for cspy-bat. The driver command is somewhat simple
	 * as it is only placed directly in the driverOptions.
	 */
    test("Test generate configuration from xcl strings", ()=>{
        const wsDir = "root";
        const projectName = "MyProject";
        const config = "Test 123";
        const driverOpts = ["test1", "test2", "test3"];
        const program = path.join("output", "exe", "foo.out");

        // Run with empty cli and we should throw an error
        try {
            XclConfigurationSupplier.generateDebugConfiguration(projectName, config, [], driverOpts);
            assert.fail("Running with empty commands should have thrown an error");
        } catch (_) {}

        // Test that the driver and target can be extracted.
        const genOpt = ["skipMe", "arm/bin/libarmsim2.so", path.resolve(path.join(wsDir, program))];
        let partialConfigTest = XclConfigurationSupplier.generateDebugConfiguration(projectName, config, genOpt, driverOpts);
        let configTest = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfigTest, wsDir);

        assert.deepStrictEqual(configTest["name"], "MyProject.Test_123");
        assert.deepStrictEqual(configTest["program"], path.join("${workspaceFolder}", program));
        assert.deepStrictEqual(configTest["driver"], "Simulator");
        assert.deepStrictEqual(configTest["target"], "arm");
        assert.deepStrictEqual(configTest["driverOptions"], driverOpts);

        const genOpt2 = ["skipMe", "arm\\bin\\armjet.dll", path.join(wsDir, program)];
        partialConfigTest = XclConfigurationSupplier.generateDebugConfiguration(projectName, config, genOpt2, driverOpts);
        configTest = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfigTest, wsDir);
        assert.deepStrictEqual(configTest["driver"], "I-jet");
        assert.deepStrictEqual(configTest["target"], "arm");

        // Ensure that we can collect all listed plugins and macros
        const genOpt3 = ["skipMe", "arm\\bin\\armijet.dll", path.resolve(wsDir, program), "--plugin=bat.dll", "--plugin=test1", "--macro=macro1", "--macro=macro2"];
        partialConfigTest = XclConfigurationSupplier.generateDebugConfiguration(projectName, config, genOpt3, driverOpts);
        configTest = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfigTest, wsDir);
        assert.deepStrictEqual(configTest["setupMacros"], ["macro1", "macro2"]);
        assert.deepStrictEqual(configTest["plugins"], ["test1"]);

    });

    /**
	 * Test that we're able to handle a series of command lines
	 * intended for cspy, retrieved e.g. via thrift.
	 */
    test("Test generate configuration from build extension api", ()=>{
        const wsDir = "root";
        const projectName = "MyProject";
        const config = "Test 123";
        const program = path.join("output", "exe", "foo.out");
        const target = "arm";

        // Run with empty cli and we should throw an error
        try {
            BuildExtensionConfigurationProvider.provideDebugConfigurationFor([], projectName, config, target);
            assert.fail("Running with empty commands should have thrown an error");
        } catch (_) {}

        const programOpt = ["/file", path.join(wsDir, program)];
        // Test that the driver and target can be extracted.
        const opts = ["/runto", "main", "/driver", "arm/bin/libriscvSIM.so", "some", "other", "opts"];
        let partialConfigTest = BuildExtensionConfigurationProvider.provideDebugConfigurationFor(opts.concat(programOpt), projectName, config, target);
        let configTest = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfigTest, wsDir);

        assert.deepStrictEqual(configTest["name"], "MyProject.Test_123");
        assert.deepStrictEqual(configTest["program"], path.join("${workspaceFolder}", program));
        assert.deepStrictEqual(configTest["driver"], "Simulator");
        assert.deepStrictEqual(configTest["target"], "arm");
        assert.deepStrictEqual(configTest["stopOnSymbol"], "main");
        assert.deepStrictEqual(configTest["driverOptions"], ["some", "other", "opts"]);

        // include some unsupported args, make sure they are ignored
        const opts2 = ["/driver", "arm\\bin\\armjet.dll", "/ilink", "/args", "test"];
        partialConfigTest = BuildExtensionConfigurationProvider.provideDebugConfigurationFor(opts2.concat(programOpt), projectName, config, target);
        configTest = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfigTest, wsDir);
        assert.deepStrictEqual(configTest["driver"], "I-jet");
        assert.deepStrictEqual(configTest["target"], "arm");
        assert.deepStrictEqual(configTest["stopOnSymbol"], false);
        assert.deepStrictEqual(configTest["driverOptions"], []);

        // Ensure that we can collect all listed plugins and macros
        const opts3 = ["/driver", "arm\\bin\\armijet.dll", path.resolve(wsDir, program), "/plugin", "bat.dll", "/plugin", "test1",
            "/setup", "macro1", "/setup", "macro2", "/devicesetup", "devmacro1", "/flashboard", "flash.ddf", "/runto", "mymain"];
        partialConfigTest = BuildExtensionConfigurationProvider.provideDebugConfigurationFor(opts3.concat(programOpt), projectName, config, target);
        configTest = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfigTest, wsDir);
        assert.deepStrictEqual(configTest["setupMacros"], ["macro1", "macro2"]);
        assert.deepStrictEqual(configTest["plugins"], ["test1"]);
        assert.deepStrictEqual(configTest["stopOnSymbol"], "mymain");
        assert.deepStrictEqual(configTest["download"]?.["deviceMacros"], ["devmacro1"]);
        assert.deepStrictEqual(configTest["download"]?.["flashLoader"], "flash.ddf");

    });
});