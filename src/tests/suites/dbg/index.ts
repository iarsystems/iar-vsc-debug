import * as path from "path";
import {getTestPromise} from "../../../utils/testutils/testUtils";
import { TestParameters } from "../testParameters";

export function run(): Promise<void> {
    TestParameters.setParameters({
        debugConfiguration: {
            target: "arm",
            driver: "sim2",
            driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting"],
            stopOnEntry:true
        },
        testProgram: { projectConfiguration: "Debug", variant: "doBuild" },
    });
/*     TestParameters.setParameters({
        debugConfiguration: {
            target: "arm",
            driver: "imperas",
            driverOptions: ["--endian=little", "--cpu=Cortex-A53", "--abi=ilp32", "--fpu=None", "--semihosting"],
            stopOnEntry:true
        },
        testProgram: { projectConfiguration: "Imperas", variant: "doBuild" },
    }); */
    return getTestPromise(path.resolve(__dirname), 20000);
}
