import * as path from "path";
import { runTestsIn} from "../utils/testutils/testRunner";

async function main() {
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/dbg/index");
    await runTestsIn(path.resolve(__dirname), "../../", "./suites/config/index", "../../src/tests/TestProjects/ConfigTests");
}

main();
