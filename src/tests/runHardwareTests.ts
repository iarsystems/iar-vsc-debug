// import { readFileSync } from "fs";
import * as path from "path";
import { exit } from "process";
import { getEnvs, runTestsIn } from "../utils/testutils/testRunner";

// !
// This way of starting tests is functionally no different fron runTest.ts -- all arguments are converted to environment variables
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
    const envs = getEnvs();
    if (!envs["cspybat-args"]) {
        console.error("Need to provide a cspybat command line.");
        printHelp();
        exit(1);
    }
    if (!envs["source-dir"]) {
        console.error("Need to provide the path to your source directory");
        printHelp();
        exit(1);
    }

    // Note that the cmdline parameters will be automatically passed to the test suites as
    // environment variables. Using envvars also lets us use the same mechanism when running tests from a launch.json.
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index");
}

main();
