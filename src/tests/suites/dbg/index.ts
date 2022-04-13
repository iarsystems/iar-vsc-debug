import * as path from "path";
import {getTestPromise} from "iar-vsc-common/testutils/testUtils";

export function run(): Promise<void> {
    return getTestPromise(path.resolve(__dirname), 20000);
}
