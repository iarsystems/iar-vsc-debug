/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { runTestsIn } from "iar-vsc-common/testutils/testRunner";
import * as path from "path";
import { exit } from "process";
import { ConfigResolutionCommon } from "../src/configproviders/supplier/common";
import { XclConfigurationSupplier } from "../src/configproviders/supplier/xclConfigurationSupplier";
import { TestConfiguration } from "./suites/testConfiguration";

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
    const cspyArgs = cmdlineEnvs["cspybat-args"].
        split(/(?<!\\)\s+/g).
        map(arg => arg.replace(/\\(?=\s)/g, "")).
        filter(arg => arg !== "--silent");
    const backendIdx = cspyArgs.indexOf("--backend");
    const partialConfig = XclConfigurationSupplier.generateDebugConfiguration(
        "",
        "Debug",
        cspyArgs.slice(0, backendIdx),
        cspyArgs.slice(backendIdx+1));
    const debugConfig = ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfig);

    if (debugConfig === undefined) {
        throw new Error("Unable to create launch config from cspybat cmdline. Check its validity.");
    }
    const config: TestConfiguration = {
        debugConfiguration: debugConfig,
        testProgram: {
            variant: "preBuilt",
            binaryPath: cspyArgs[2]!,
            sourceDir: cmdlineEnvs["source-dir"],
        },
        registers: {
            ...TestConfiguration.TEST_CONFIGURATIONS["armSim2"]!.registers,
        },
        dataBreakpointsAreUnreliable: true,
        isHardwareTest: true,
        stopsAfterMain: false,
        usesEmbeddedCpp: false
    };
    if (cspyArgs.includes("--fpu=None")) {
        config.registers.fpuRegisters = undefined;
    }
    const configEnvs = TestConfiguration.asEnvVars(config);
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index", {...cmdlineEnvs, ...configEnvs}, undefined, "Sim2");
}

/**
 * Construct a key:string based on the supplied options from the commandline.
 * @returns
 */
function getEnvs(): Record<string, string> {
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
