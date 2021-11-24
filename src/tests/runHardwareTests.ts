import * as path from "path";
import { exit } from "process";
import { runTestsIn, getEnvs } from "../utils/testutils/testRunner";

function printHelp() {
    console.log("Utility for running hardware tests");
    console.log("--iar-dbg=[path]   The path to the iar-dbg extension");
    console.log("--test-project=[path]   The path to the .ewp file to use");
    console.log("--test-config=[config]   The name of the configuration to use");
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

    //process.env["test-project"] = envs["test-project"];
    //process.env["test-config"] = envs["test-config"];

    // Run the test-suite but pass a path that does not exist to trick vs-code to not load the
    // the new-build extension.
    await runTestsIn("", "iDontExist", path.resolve(__dirname) + "/suites/index", undefined, [envs["iar-dbg"]]);
}

main();
