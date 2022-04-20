import { runTestsIn } from "iar-vsc-common/testutils/testRunner";
import * as path from "path";
import { exit } from "process";
import { ConfigResolutionCommon } from "../src/configresolution/common";
import { XclConfigurationProvider } from "../src/configresolution/xclConfigurationProvider";
import { TestConfiguration } from "./suites/testConfiguration";

// !
// This way of starting tests is functionally no different fron runTests.ts -- all arguments are converted to environment variables
// anyway, and those vars are then read by the test suites. You could use the same command line with runTest.ts and get
// the exact same results. However, this file provides some help and documentation for the parameters we expect when running hardware tests,
// and avoids running test suites that are unnecessary to run on hardware.
// !


function printHelp() {
    console.log("Utility for running hardware tests");
    console.log("--cspybat-args=[args]   A complete cspybat command line used to determine the e.g. the driver and driver arguments.");
    console.log("--source-dir=[path]  The path to the directory containing the source files you have built your debugee from. Needed to resolve the expected source info paths.");
}

async function main() {
    if (process.argv.includes("--help")) {
        printHelp();
        exit(0);
    }
    // Get the list of variables
    const cmdlineEnvs = getEnvs();
    if (!cmdlineEnvs["cspybat-args"]) {
        console.error("Need to provide a cspybat command line.");
        printHelp();
        exit(1);
    }
    if (!cmdlineEnvs["source-dir"]) {
        console.error("Need to provide the path to your source directory");
        printHelp();
        exit(1);
    }
    const cspyArgs = cmdlineEnvs["cspybat-args"].split(/(?<!\\)\s+/g);
    const backendIdx = cspyArgs.indexOf("--backend");
    const partialConfig = XclConfigurationProvider.generateDebugConfiguration(
        "",
        "Debug",
        cspyArgs.slice(0, backendIdx),
        cspyArgs.slice(backendIdx+1));
    const debugConfig = ConfigResolutionCommon.instantiateConfiguration(partialConfig);

    if (debugConfig === undefined) {
        throw new Error("Unable to create launch config from cspybat cmdline. Check its validity.");
    }
    const config: TestConfiguration = {
        debugConfiguration: debugConfig,
        testProgram: {
            variant: "preBuilt",
            binaryPath: "", // TODO:
            sourceDir: cmdlineEnvs["source-dir"],
        },
        expectPeriphals: true,
    };
    const configEnvs = TestConfiguration.asEnvVars(config);
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index", {...cmdlineEnvs, ...configEnvs}, undefined, "Sim2");

    // Note that the cmdline parameters will be automatically passed to the test suites as
    // environment variables. Using envvars also lets us use the same mechanism when running tests from a launch.json.
    // TODO: temporarily broken
    // await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index");
}

/**
 * Construct a key:string based on the supplied options from the commandline.
 * @returns
 */
export function getEnvs(): Record<string, string> {
    const envs: Record<string, string> = {};
    for (const opt of process.argv.slice(2)) {
        if (opt.startsWith("--")) {
            const separatorIdx = opt.indexOf("=");
            if (separatorIdx === -1) {
                const optName = opt.substring(2);
                envs[optName] = "true";
            } else {
                const optName = opt.substring(2, separatorIdx);
                const val = opt.substring(separatorIdx + 1);
                envs[optName] = val;
            }
        }
    }
    return envs;
}

main();
