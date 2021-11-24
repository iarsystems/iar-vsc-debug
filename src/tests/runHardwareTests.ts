import { readFileSync } from "fs";
import * as path from "path";
import { exit } from "process";
import { runTestsIn, getEnvs } from "../utils/testutils/testRunner";

function printHelp() {
    console.log("Utility for running hardware tests");
    console.log("--iar-dbg=[path]   The path to the iar-dbg extension");
    console.log(`--config-json=[path]   The path to a debug config json file. Any fields in this file will override those used to launch test debug sessions.`);
}

async function main() {
    if (process.argv.includes("--help")) {
        printHelp();
        exit(0);
    }
    // Get the list of variables
    const envs = getEnvs();
    if (!envs["iar-dbg"]) {
        console.error("Need to provide paths to debug extension");
        printHelp();
        exit(1);
    }

    if (envs["config-json"]) {
        // We pass the overrides to the test suites as an environment variable. This makes it possible to use the same
        // mechanism from a launch.json file, when running tests from vscode.
        process.env["config-overrides"] = readFileSync(envs["config-json"]).toString();
    }

    // Run the test-suite but pass a path that does not exist to trick vs-code to not load the
    // the new-build extension.
    await runTestsIn("", "iDontExist", path.resolve(__dirname) + "/suites/index", undefined, [envs["iar-dbg"]]);
}

main();
