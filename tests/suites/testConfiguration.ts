/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { CSpyLaunchRequestArguments } from "../../src/dap/cspyDebug";
import * as Path from "path";

interface RegisterSpecification {
    name: string,
    hasChildren?: boolean,
}

/**
 * Global parameters for a test run. These can be configured e.g. from the command line
 * to run the tests for a specific driver or device. See runTest.ts for how to specify parameters.
 */
export interface TestConfiguration {
    /**
     * For all tests that need to start a debug session, this is the base configuration to use.
     */
    debugConfiguration: Omit<CSpyLaunchRequestArguments, "workbenchPath" | "program" | "projectPath" | "projectConfiguration">,
    /**
     * The 'dbg' suite uses a specific test program to run debugging tests (see TestProjects/GettingStarted/).
     * The program needs to be built to match the {@link debugConfiguration} (e.g. for the correct device).
     *
     * This parameter specifices how to get the binary for the test program, and can take the following variants:
     * doBuild - Build the given project with the given configuration (e.g. "Debug"), and use the built binary.
     * preBuilt - Don't build anything, instead use the given binary. This means you must have built the test program yourself (useful when testing with t2).
     */
    testProgram: {
        variant: "doBuild",
        project: string,
        projectConfiguration: string,
    } | {
        variant: "preBuilt",
        binaryPath: string,
        sourceDir: string, // Directory where the source files were when you compiled the program (i.e. where the debug info will point)
    };
    /**
     * To run multicore (SMP) tests, set this to a value larger than 1. Note that the test program must be built with
     * multicore support (e.g. with a cstartup file that sets up the runtime environment for each  core).
     */
    multicoreNrOfCores?: number,
    registers: {
        /** Whether to expect (and test for) the debugger to provide peripheral register. */
        expectPeripherals: boolean,
        cpuRegisters: {
            /** The name of the register group containing the main cpu registers. */
            groupName: string,
            /** Registers that should be present in the fpu group. */
            registers: RegisterSpecification[],
            /** The bit width of a typical register */
            size: 16 | 32 | 64;
        },
        fpuRegisters?: {
            /** The name of the register group containing the main fpu registers. */
            groupName: string,
            /** Registers that should be present in the fpu group. */
            registers: RegisterSpecification[],
        },
    },
    /**
     * If true, signals that data breakpoints do not always break immediately on
     * access, but rather a few instructions later. This is usually the case for
     * hardware debugging.
     */
    dataBreakpointsAreUnreliable: boolean,
    /**
     * Whether to run only a small set of tests to verify the most basic functionality.
     */
    smokeTestsOnly?: boolean,
    /**
     * Whether the tests are running in the hardware test rig.
     */
    isHardwareTest: boolean;
    /**
     * Most targets stop *exactly* at the declaration() of main() at the start
     * of a session, but some stop on the first statement in main() (those
     * targets should set this to true).
     */
    stopsAfterMain: boolean;

    /**
     * As some older target lacks full c++ support, the use something called
     * embedded c++ which, e.g., removes std:: from all stl calls.
     */
    usesEmbeddedCpp: boolean
}

export namespace TestConfiguration {
    let parameters: TestConfiguration | undefined;
    const ENV_KEY_PARAMS = "TEST_PARAMETERS";
    export const ENV_KEY_NAME = "TEST_CONFIGURATION_NAME";

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
        result[ENV_KEY_PARAMS] = JSON.stringify(params);
        return result;
    }

    /**
     * Returns the parameters to use for the current test run,
     * if any have been set using the methods above.
     * Defaults to {@link ARMSIM2_CONFIG}.
     */
    export function getConfiguration(): TestConfiguration {
        const smokeTestsOnly = !!process.env["smoke-tests"];
        if (parameters) {
            return { ...parameters, smokeTestsOnly };
        }
        const envParams = process.env[ENV_KEY_PARAMS];
        if (envParams) {
            return { ...JSON.parse(envParams), smokeTestsOnly };
        }
        const envConfigName = process.env[ENV_KEY_NAME];
        if (envConfigName && TEST_CONFIGURATIONS[envConfigName]) {
            return { ...TEST_CONFIGURATIONS[envConfigName]!, smokeTestsOnly };
        }
        return { ...TEST_CONFIGURATIONS["armSim2"]!, smokeTestsOnly };
    }

    const ARM_SIM2_CONFIG: TestConfiguration = {
        debugConfiguration: {
            target: "arm",
            driver: "Simulator",
            driverOptions: [
                "--endian=little",
                "--cpu=Cortex-A9",
                "--fpu=VFPv3Neon",
                "--device=Zynq 7020",
                "--semihosting",
                "-p",
                "$TOOLKIT_DIR$/config/debugger/AMD/Zynq 7020.ddf",
            ],
        },
        testProgram: {
            project: Path.join(
                __dirname,
                "../../../tests/TestProjects/GettingStarted/sim2.ewp",
            ),
            projectConfiguration: "Debug",
            variant: "doBuild",
        },
        multicoreNrOfCores: 2,
        registers: {
            expectPeripherals: true,
            cpuRegisters: {
                groupName: "Current CPU Registers",
                registers: [
                    { name: "R4", hasChildren: false },
                    { name: "SP", hasChildren: false },
                    { name: "PC", hasChildren: false },
                    { name: "APSR", hasChildren: true },
                ],
                size: 32,
            },
            fpuRegisters: {
                groupName: "Floating-point Extension registers",
                registers: [{ name: "S6", hasChildren: true }, { name: "D12" }],
            },
        },
        dataBreakpointsAreUnreliable: false,
        isHardwareTest: false,
        stopsAfterMain: false,
        usesEmbeddedCpp: false
    };

    /// Standard test configurations below
    export const TEST_CONFIGURATIONS: { [id: string]: TestConfiguration } = {
        armSim2: ARM_SIM2_CONFIG,
        // For EWARM 8.50, uses a different ddf file
        armSim2v850: {
            ...ARM_SIM2_CONFIG,
            debugConfiguration: {
                ...ARM_SIM2_CONFIG.debugConfiguration,
                driverOptions: [
                    "--endian=little",
                    "--cpu=Cortex-A9",
                    "--fpu=VFPv3Neon",
                    "--device=Zynq 7020",
                    "--semihosting",
                    "-p",
                    "$TOOLKIT_DIR$/config/debugger/xilinx/Zynq 7020.ddf",
                ],
            },
        },
        armImperas: {
            debugConfiguration: {
                target: "arm",
                driver: "64-bit Simulator",
                driverOptions: [
                    "--endian=little",
                    "--cpu=Cortex-A53",
                    "--abi=ilp32",
                    "--fpu=None",
                    "--semihosting",
                ],
            },
            testProgram: {
                project: Path.join(
                    __dirname,
                    "../../../tests/TestProjects/GettingStarted/Imperas.ewp",
                ),
                projectConfiguration: "Imperas",
                variant: "doBuild",
            },
            registers: {
                expectPeripherals: false,
                cpuRegisters: {
                    groupName: "Current CPU Registers",
                    registers: [
                        { name: "X4", hasChildren: true },
                        { name: "SP", hasChildren: false },
                        { name: "PC", hasChildren: false },
                        { name: "PSTATE", hasChildren: true },
                    ],
                    size: 64,
                },
                fpuRegisters: {
                    groupName: "Floating-point registers",
                    registers: [
                        { name: "s6", hasChildren: true },
                        { name: "d12", hasChildren: true },
                    ],
                },
            },
            dataBreakpointsAreUnreliable: false,
            isHardwareTest: false,
            stopsAfterMain: false,
            usesEmbeddedCpp: false
        },
        riscvSim: {
            debugConfiguration: {
                target: "riscv",
                driver: "Simulator",
                driverOptions: [
                    "--core=RV32IMAFDC",
                    "-p",
                    "$TOOLKIT_DIR$/config/debugger/SiFive/e31_arty100t.ddf",
                    "-d",
                    "sim",
                ],
            },
            testProgram: {
                project: Path.join(
                    __dirname,
                    "../../../tests/TestProjects/GettingStarted/riscv.ewp",
                ),
                projectConfiguration: "Debug",
                variant: "doBuild",
            },
            registers: {
                expectPeripherals: true,
                cpuRegisters: {
                    groupName: "CPU Registers (ABI)",
                    registers: [
                        { name: "ra", hasChildren: false },
                        { name: "pc", hasChildren: false },
                    ],
                    size: 32,
                },
                fpuRegisters: {
                    groupName: "FPU Status Registers",
                    registers: [{ name: "fflags", hasChildren: true }],
                },
            },
            dataBreakpointsAreUnreliable: false,
            isHardwareTest: false,
            stopsAfterMain: false,
            usesEmbeddedCpp: false
        },
        rh850Sim: {
            debugConfiguration: {
                target: "rh850",
                driver: "Simulator",
                driverOptions: [
                    "--core",
                    "g3m",
                    "-p",
                    "$TOOLKIT_DIR$/config/debugger/iorh850_g3m.ddf",
                    "--double=64",
                    "-d",
                    "sim",
                    "--multicore_nr_of_cores=1",
                ],
            },
            testProgram: {
                project: Path.join(
                    __dirname,
                    "../../../tests/TestProjects/GettingStarted/rh850.ewp",
                ),
                projectConfiguration: "Debug",
                variant: "doBuild",
            },
            registers: {
                expectPeripherals: true,
                cpuRegisters: {
                    groupName: "CPU registers",
                    registers: [
                        { name: "R1", hasChildren: false },
                        { name: "PC", hasChildren: false },
                        { name: "PSW", hasChildren: true },
                    ],
                    size: 32,
                },
                fpuRegisters: {
                    groupName: "FPU registers",
                    registers: [
                        { name: "FPSR", hasChildren: true },
                        { name: "FPEPC", hasChildren: false },
                    ],
                },
            },
            dataBreakpointsAreUnreliable: false,
            isHardwareTest: false,
            stopsAfterMain: false,
            usesEmbeddedCpp: false
        },
        rl78Sim: {
            debugConfiguration: {
                target: "rl78",
                driver: "Simulator",
                driverOptions: [
                    "--core",
                    "s3",
                    "--near_const_location",
                    "rom0",
                    "--near_const_start",
                    "0xF3000",
                    "--near_const_size",
                    "27.749",
                    "-p",
                    "$TOOLKIT_DIR$/config/debugger/iorl78_s3.ddf",
                    "--double=32",
                    "-d",
                    "sim",
                    "--multicore_nr_of_cores=1",
                ],
            },
            testProgram: {
                project: Path.join(
                    __dirname,
                    "../../../tests/TestProjects/GettingStarted/rl78.ewp",
                ),
                projectConfiguration: "Debug",
                variant: "doBuild",
            },
            registers: {
                expectPeripherals: true,
                cpuRegisters: {
                    groupName: "CPU Registers",
                    registers: [
                        { name: "AX", hasChildren: true },
                        { name: "PC", hasChildren: false },
                        { name: "PSW", hasChildren: true },
                    ],
                    size: 16,
                },
            },
            dataBreakpointsAreUnreliable: false,
            isHardwareTest: false,
            stopsAfterMain: true,
            usesEmbeddedCpp: false
        },
        msp430Sim: {
            debugConfiguration: {
                target: "msp430",
                driver: "Simulator",
                driverOptions: [
                    "--hwmul_base",
                    "0x4C0",
                    "--hardware_multiplier",
                    "32",
                    "--hwmult_type",
                    "8",
                    "-p",
                    "$TOOLKIT_DIR$/config/debugger/msp430fr6047.ddf",
                    "--core=430Xv2",
                    "--data_model=small",
                    "--iv_base",
                    "0xFF90",
                    "--energytrace",
                    "--odd_word_check",
                    "-d",
                    "sim",
                    "--derivativeSim",
                    "MSP430FR6047"
                ],
            },
            testProgram: {
                project: Path.join(
                    __dirname,
                    "../../../tests/TestProjects/GettingStarted/msp430.ewp",
                ),
                projectConfiguration: "Debug",
                variant: "doBuild",
            },
            registers: {
                expectPeripherals: true,
                cpuRegisters: {
                    groupName: "CPU Registers",
                    registers: [
                        { name: "PC", hasChildren: false },
                        { name: "R4", hasChildren: false },
                        { name: "SR", hasChildren: true },
                    ],
                    size: 16,
                },
            },
            dataBreakpointsAreUnreliable: false,
            isHardwareTest: false,
            stopsAfterMain: false,
            usesEmbeddedCpp: true,
            multicoreNrOfCores: 1,
        },
    };
}