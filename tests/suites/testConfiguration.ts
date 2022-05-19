/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { CSpyLaunchRequestArguments } from "../../src/dap/cspyDebug";

/**
 * Global parameters for a test run. These can be configured e.g. from the command line
 * to run the tests for a specific driver or device. See runTest.ts for how to specify parameters.
 */
export interface TestConfiguration {
    /**
     * For all tests that need to start a debug session, this is the base configuration to use.
     */
    debugConfiguration: Omit<CSpyLaunchRequestArguments, "workbenchPath" | "program" | "projectPath" | "projectConfiguration" | "stopOnEntry">,
    /**
     * The 'dbg' suite uses a specific test program to run debugging tests (see TestProjects/GettingStarted/).
     * The program needs to be built to match the {@link debugConfiguration} (e.g. for the same device).
     *
     * This parameter specifices how to get the binary for the test program, and can take the following variants:
     * doBuild - Build 'TestProjects/GettingStarted/BasicDebugging.ewp' with the given configuration (e.g. "Debug"), and use the built binary.
     * preBuilt - Don't build anything, instead use the given binary. This means you must have built the test program yourself (useful when testing with t2).
     */
    testProgram: {
        variant: "doBuild",
        projectConfiguration: string
    } | {
        variant: "preBuilt",
        binaryPath: string,
        sourceDir: string, // Directory where the source files were when you compiled the program (i.e. where the debug info will point)
    };
    /**
     * Whether to expect (and test for) the debugger to provide peripheral register.
     */
    expectPeriphals: boolean,
    /**
     * Whether to expect (and test for) the device to have floating-point registers.
     */
    hasFPU: boolean,
}

export namespace TestConfiguration {
    let parameters: TestConfiguration | undefined;
    const ENV_KEY = "TEST_PARAMETERS";

    /**
     * Sets the test parameters to use for the current test run.
     * This should only be called from the same process as the tests will run in.
     * When running tests from the command line, use {@link asEnvVars} instead.
     */
    export function setParameters(params: TestConfiguration) {
        parameters = params;
    }

    /**
     * Returns the given parameters as a set of environment variables. When running tests from the command line,
     * this can be used to pass parameters to the tests before starting the VS Code test process.
     * Simply pass the returned variables as environment variables to the test process.
     */
    export function asEnvVars(params: TestConfiguration): Record<string, string> {
        const result: Record<string, string> = {};
        result[ENV_KEY] = JSON.stringify(params);
        return result;
    }

    /**
     * Returns the parameters to use for the current test run,
     * if any have been set using the methods above.
     * Defaults to {@link ARMSIM2_CONFIG}.
     */
    export function getConfiguration(): TestConfiguration {
        if (parameters) {
            return parameters;
        }
        const envParams = process.env[ENV_KEY];
        if (envParams) {
            return JSON.parse(envParams);
        }
        return ARMSIM2_CONFIG;
    }

    /// Standard test configurations below
    export const ARMSIM2_CONFIG: TestConfiguration = {
        debugConfiguration: {
            target: "arm",
            driver: "sim2",
            driverOptions: ["--endian=little", "--cpu=Cortex-M4", "--fpu=VFPv4_SP", "--semihosting"],
        },
        testProgram: { projectConfiguration: "Debug", variant: "doBuild" },
        expectPeriphals: true,
        hasFPU: true,
    };
    export const ARMIMPERAS_CONFIG: TestConfiguration = {
        debugConfiguration: {
            target: "arm",
            driver: "imperas",
            driverOptions: ["--endian=little", "--cpu=Cortex-A53", "--abi=ilp32", "--fpu=None", "--semihosting"],
        },
        testProgram: { projectConfiguration: "Imperas", variant: "doBuild" },
        expectPeriphals: false,
        hasFPU: true,
    };
}