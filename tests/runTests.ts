/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as path from "path";
import { OsUtils } from "iar-vsc-common/osUtils";
import { runTestsIn} from "iar-vsc-common/testutils/testRunner";
import { TestConfiguration } from "./suites/testConfiguration";

async function main() {
    const armsimEnvs = TestConfiguration.asEnvVars(TestConfiguration.ARMSIM2_CONFIG);
    const armimperasEnvs = TestConfiguration.asEnvVars(TestConfiguration.ARMIMPERAS_CONFIG);
    const cmdlineEnvs = getEnvs();
    const doSmokeTests = !!cmdlineEnvs["smoke-tests"];
    const label = cmdlineEnvs["label"];
    // Configuration tests are not driver-dependent, so running it with only one config is fine
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/config/index", {...cmdlineEnvs, ...armsimEnvs}, "../../tests/TestProjects/ConfigTests");

    // Run debugger tests with both 32-bit and 64-bit simulator
    console.log("------Running sim2 tests------");
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index", {...cmdlineEnvs, ...armsimEnvs},
        undefined, label ? `${label}.Sim2` : "Sim2");
    if (!doSmokeTests && OsUtils.OsType.Windows === OsUtils.detectOsType()) {
        console.log("------Running imperas tests------");
        await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index", {...cmdlineEnvs, ...armimperasEnvs},
            undefined, label ? `${label}.Imperas` : "Imperas");
    }
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
