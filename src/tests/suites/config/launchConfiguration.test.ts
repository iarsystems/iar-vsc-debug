
import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import { CSpyConfigurationProvider } from "../../../dap/configresolution/cspyConfigurationProvider";
import { OsUtils } from "../../../utils/osUtils";

/**
 * This test suite tests our ability to generate a launch configuration based on the xcl files
 * and their content.
 * As such, the testsuite as a whole will test the concept as it can split into minor segments.
 */
suite("Configuration tests", () => {

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
        const folders = vscode.workspace.workspaceFolders;
        console.log(folders);
        if (!folders || !folders[0]) {
            assert.fail("Failed to located the current workspace.");
        }

        const cspyConfigs = await CSpyConfigurationProvider.getProvider().provideDebugConfigurations(folders[0]);
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
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || !folders[0]) {
            assert.fail("Failed to located the current workspace.");
        }
        const dummyConfig: any = {};
        const cspyConfig = await CSpyConfigurationProvider.getProvider().resolveDebugConfiguration(folders[0], dummyConfig, undefined);

        if (!cspyConfig || cspyConfig === null) {
            assert.fail("Failed to generate a configuration");
        }

        const config = CSpyConfigurationProvider.getProvider().getVscJson(folders[0])["configuration"];

        // Check that we've collected the correct information for the project
        assert.deepStrictEqual(cspyConfig["name"], "BasicDebugging." + config);
        assert.deepStrictEqual(cspyConfig["type"], "cspy");
        assert.deepStrictEqual(cspyConfig["projectConfiguration"], config);
        assert.deepStrictEqual(cspyConfig["driver"], "sim2");
        assert.deepStrictEqual(cspyConfig["target"], "arm");
    });

    /**
	 * Test that we're able to handle a series of command lines
	 * intended for cspy-bat. The driver command is somewhat simple
	 * as it is only placed directly in the driverOptions.
	 */
    test("Test generate configuration from strings", ()=>{
        const wsDir = "root";
        const ewpDir = "EW_INSTALL";
        const launchName = "My Launch";
        const config = "Test";
        const driverOpts = ["test1", "test2", "test3"];
        const program = path.join("output", "exe", "foo.out");

        // Run with empty cli and we should get an undefined as return.
        let configTest = CSpyConfigurationProvider.getProvider().generateDebugConfiguration(wsDir, ewpDir, launchName, config, [], driverOpts);
        assert.deepStrictEqual(configTest, undefined);

        // Test that the driver and target can be extracted.
        const genOpt = ["skipMe", "arm/bin/libarmsim2.so", path.join(wsDir, program)];
        configTest = CSpyConfigurationProvider.getProvider().generateDebugConfiguration(wsDir, ewpDir, launchName, config, genOpt, driverOpts);
        if (!configTest) {
            assert.fail("Failed to generate configuration");
        }

        assert.deepStrictEqual(configTest["name"], launchName);
        assert.deepStrictEqual(configTest["program"], path.join("${workspaceFolder}", program));
        assert.deepStrictEqual(configTest["driver"], "sim2");
        assert.deepStrictEqual(configTest["target"], "arm");
        assert.deepStrictEqual(configTest["driverOptions"], driverOpts);

        const genOpt2 = ["skipMe", "arm\\bin\\armjet.dll", path.join(wsDir, program)];
        configTest = CSpyConfigurationProvider.getProvider().generateDebugConfiguration(wsDir, ewpDir, launchName, config, genOpt2, driverOpts);
        if (!configTest) {
            assert.fail("Failed to generate configuration");
        }
        assert.deepStrictEqual(configTest["driver"], "jet");
        assert.deepStrictEqual(configTest["target"], "arm");

        // Ensure that we can collect all listed plugins and macros
        const genOpt3 = ["skipMe", "arm\\bin\\armijet.dll", path.resolve(wsDir, program), "--plugin=bat.dll", "--plugin=test1", "--macro=macro1", "--macro=macro2"];
        configTest = CSpyConfigurationProvider.getProvider().generateDebugConfiguration(wsDir, ewpDir, launchName, config, genOpt3, driverOpts);
        if (!configTest) {
            assert.fail("Failed to generate configuration");
        }
        assert.deepStrictEqual(configTest["setupMacros"], ["macro1", "macro2"]);
        assert.deepStrictEqual(configTest["plugins"], ["test1"]);

    });

});