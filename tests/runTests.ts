/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as path from "path";
import { runTestsIn} from "iar-vsc-common/testutils/testRunner";
import { TestConfiguration } from "./suites/testConfiguration";

async function main() {
    const envs = getEnvs();

    const testConfigurationName = envs["test-configuration"];
    if (testConfigurationName) {
        envs[TestConfiguration.ENV_KEY_NAME] = testConfigurationName;
        if (TestConfiguration.TEST_CONFIGURATIONS[testConfigurationName]) {
            TestConfiguration.setParameters(TestConfiguration.TEST_CONFIGURATIONS[testConfigurationName]!);
        }
    }
    const label = envs["label"];
    const suite = envs["suite"];
    if (suite === "configuration") {
        await runTestsIn(path.resolve(__dirname), "../../", "./suites/config/index", envs,
            "../../tests/TestProjects/ConfigTests", label);
    } else if (suite === "debugger") {
        await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index", envs,
            undefined, label);
    } else if (suite === "listwindow") {
        await runTestsIn(path.resolve(__dirname), "../../", "./suites/listwindow/index", envs,
            undefined, label);
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
