/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Workbench } from "iar-vsc-common/workbench";
import * as vscode from "vscode";
import { CSpyDriver } from "../dap/breakpoints/cspyDriver";
import { CSpyConfigurationSupplier, CSpyConfigurationSupplier as LaunchConfigurationSupplier } from "./supplier/supplier";
import { PartialCSpyLaunchRequestArguments } from "../dap/cspyDebug";

/**
 * Provides a list of automatic launch.json configurations from a workspace folder containing .ewp projects
 */
export class CSpyConfigurationsProvider implements vscode.DebugConfigurationProvider {

    async provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, _?: vscode.CancellationToken): Promise<LaunchConfigurationSupplier.CspyLaunchJsonConfiguration[] | undefined> {
        const supplierResult = await LaunchConfigurationSupplier.supplyAllLaunchConfigsFor(folder);
        if (typeof supplierResult === "number") {
            vscode.window.showErrorMessage(LaunchConfigurationSupplier.toErrorMessage(supplierResult));
        } else {
            return supplierResult;
        }
        return [];
    }
}

/**
 *  Resolves the driver options and debugconfigurations from the ewp-file.
 */
export class PartialCSpyConfigurationProvider
implements vscode.DebugConfigurationProvider {
    async resolveDebugConfigurationWithSubstitutedVariables?(
        _folder: vscode.WorkspaceFolder | undefined,
        debugConfiguration: LaunchConfigurationSupplier.CspyLaunchJsonConfiguration,
        _?: vscode.CancellationToken,
    ): Promise<vscode.DebugConfiguration | null | undefined> {
        if (
            (!debugConfiguration.driverOptions || !debugConfiguration.driver) &&
            debugConfiguration.projectPath &&
            debugConfiguration.projectConfiguration && debugConfiguration.workbenchPath
        ) {
            const supplierResult =
                await CSpyConfigurationSupplier.supplyDefaultLaunchConfigForProject(
                    debugConfiguration.workbenchPath,
                    debugConfiguration.projectPath,
                    debugConfiguration.projectConfiguration,
                    debugConfiguration.target,
                );
            if (typeof supplierResult === "number") {
                vscode.window.showErrorMessage(CSpyConfigurationSupplier.toErrorMessage(supplierResult));
            } else {
                debugConfiguration = { ...supplierResult, ...debugConfiguration };
            }
        }
        return debugConfiguration;
    }
}


/**
 * Like ${@link CSpyConfigurationsProvider}, but shows a quickpick to let the user choose a single launch.json configuration.
 * The list includes "template" configurations which can serve as starting points writing custom configurations.
 */
export class InitialCSpyConfigurationProvider implements vscode.DebugConfigurationProvider {

    async provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, _?: vscode.CancellationToken): Promise<LaunchConfigurationSupplier.CspyLaunchJsonConfiguration[] | undefined> {
        const options: Array<vscode.QuickPickItem & {launchConfig?: LaunchConfigurationSupplier.CspyLaunchJsonConfiguration}> = [];
        let relevantTemplates = TEMPLATES;

        const supplierResult = await LaunchConfigurationSupplier.supplyAllLaunchConfigsFor(folder);
        if (typeof supplierResult === "number") {
            vscode.window.showErrorMessage(LaunchConfigurationSupplier.toErrorMessage(supplierResult));
        } else {
            // The build extension is installed, so we can suggest the "minimal" configuration.
            options.push({ label: "Debug the active IAR project", description: "Use the selection from the IAR Build extension", launchConfig: MINIMAL_CONFIG });
            if (supplierResult.length > 0) {
                options.push({ label: "Auto-generated from project", kind: vscode.QuickPickItemKind.Separator });
                supplierResult.forEach(launchConfig => {
                    options.push({ label: launchConfig.name, description: launchConfig.driver, launchConfig });
                });
            }
            relevantTemplates = TEMPLATES.filter(template => supplierResult.some(config => config.target === template.target));
        }
        if (relevantTemplates.length > 0) {
            options.push({ label: "Templates", kind: vscode.QuickPickItemKind.Separator });
            relevantTemplates.forEach(template =>
                options.push({
                    label: template.name,
                    description:
                        Workbench.getTargetDisplayName(template.target) +
                        " template",
                    launchConfig: template,
                }),
            );
        }

        const choice = await vscode.window.showQuickPick(options, { title: "Select initial launch.json configuration" });
        if (choice?.launchConfig) {
            return [choice.launchConfig];
        } else {
            const fallbackChoice = options.find(option => option.launchConfig !== undefined);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return fallbackChoice ? [fallbackChoice.launchConfig!] : undefined;
        }
    }
}

/**
 * For empty debug configurations (e.g. when the user presses "Run & Debug" without a launch.json file), tries to
 * provide a full launch.json configuration based on the project and config selected in the build extension (e.g. an
 * automatic "default" configuration).
 */
export class DefaultCSpyConfigurationResolver implements vscode.DebugConfigurationProvider {
    async resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        debugConfiguration: vscode.DebugConfiguration,
        __?: vscode.CancellationToken
    ): Promise<vscode.DebugConfiguration | undefined> {
        // Handle empty or non-existant launches
        if (!debugConfiguration.type && !debugConfiguration.request && !debugConfiguration.name) {
            const supplierResult = await LaunchConfigurationSupplier.supplyDefaultLaunchConfig(folder);
            if (typeof supplierResult === "number") {
                vscode.window.showErrorMessage(LaunchConfigurationSupplier.toErrorMessage(supplierResult));
                return undefined;
            } else {
                return supplierResult;
            }
        }

        return debugConfiguration;
    }
}

const MINIMAL_CONFIG: LaunchConfigurationSupplier.CspyLaunchJsonConfiguration = {
    type: "cspy",
    request: "launch",
    name: "Debug the active IAR Project",
    workbenchPath: "${command:iar-config.toolchain}",
    projectPath: "${command:iar-config.project-file}",
    projectConfiguration: "${command:iar-config.project-configuration}",
    buildBeforeDebugging: "AskOnFailure"
};

const TEMPLATES: Array<vscode.DebugConfiguration & PartialCSpyLaunchRequestArguments> = [
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY Simulator",
        target: "arm",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.SIMULATOR,
        driverOptions: [
            "--endian=little",
            "--cpu=<CPU-NAME>",
            "--fpu=None",
            "--semihosting"
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY I-Jet",
        target: "arm",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.IJET,
        driverOptions: [
            "--endian=little",
            "--cpu=<CPU-NAME>",
            "--fpu=<FPU-NAME>",
            "-p",
            "<EW-PATH>/arm/config/debugger/<PATH-TO-.ddf>",
            "--device=<DEVICE-NAME>",
            "--semihosting",
            "--jet_standard_reset=4,0,0",
            "--reset_style=\"0,-,0,Disabled (no reset)\"",
            "--reset_style=\"1,-,0,Software\"",
            "--reset_style=\"2,-,0,Hardware\"",
            "--reset_style=\"3,-,0,Core\"",
            "--reset_style=\"4,-,1,System\"",
            "--reset_style=\"9,ConnectUnderReset,0,Connect during reset\"",
            "--jet_power_from_probe=leave_on",
            "--drv_interface=SWD",
            "--jet_cpu_clock=180000000",
            "--drv_catch_exceptions=0xff0"
        ],
        download: {
            flashLoader: "<EW-PATH>/arm/config/flashloader/<PATH-TO-.board>",
            deviceMacros: [
                "<EW-PATH>/arm/config/debugger/<PATH-TO-.dmac>"
            ]
        }
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY Simulator",
        target: "riscv",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.SIMULATOR,
        driverOptions: [
            "--core=RV32IMAFDCN_XANDESDSP_XANDESPERF_Zba_Zbb_Zbc_Zbs",
            "-p",
            "<EW-PATH>/riscv/config/debugger/ioriscv.ddf",
            "-d",
            "sim"
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY I-Jet",
        target: "riscv",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.IJET,
        driverOptions: [
            "--core=RV32IMAFDCN_XANDESDSP_XANDESPERF_Zba_Zbb_Zbc_Zbs",
            "-p",
            "<EW-PATH>/riscv/config/debugger/ioriscv.ddf",
            "--jet_standard_reset=2,300,200",
            "--reset_style=\"0,-,0,Disabled (no reset)",
            "--reset_style=\"1,-,0,Software",
            "--reset_style=\"2,-,1,Hardware",
            "--reset_style=\"3,-,0,Core",
            "--reset_style=\"4,-,0,System",
            "--drv_catch_exceptions=0x70000000",
            "--drv_system_bus_access"
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY Simulator",
        target: "rh850",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.SIMULATOR,
        driverOptions: [
            "--core",
            "g3m",
            "-p",
            "<EW-PATH>/rh850/config/debugger/iorh850_g3m.ddf",
            "--double=64",
            "-d",
            "sim",
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY E1/E2/E20 Emulator",
        target: "rh850",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.E1,
        driverOptions: [
            "--core",
            "g3m",
            "-p",
            "<EW-PATH>/rh850/config/debugger/iorh850_g3m.ddf",
            "--double=64",
            "-d",
            "e1",
            "--drv_verify_download",
            "--LPD1_baud",
            "0",
            "--cspybat_inifile",
            "${workspaceFolder}/settings/<PROJECT-NAME>.dnx"
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY Simulator",
        target: "rl78",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.SIMULATOR,
        driverOptions: [
            "--core",
            "s2",
            "--near_const_location",
            "rom0",
            "--near_const_start",
            "0xF2000",
            "--near_const_size",
            "51.749",
            "-p",
            "<EW-PATH>/rl78/config/debugger/iorl78_s2.ddf",
            "--double=32",
            "-d",
            "sim",
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY E2 Emulator",
        target: "rl78",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.E2,
        driverOptions: [
            "--core",
            "s2",
            "--near_const_location",
            "ram",
            "--near_const_start",
            "0xF2000",
            "--near_const_size",
            "0.000",
            "-p",
            "<EW-PATH>/rl78/config/debugger/ior5f10968.ddf",
            "--double=32",
            "-d",
            "e2",
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY Simulator",
        target: "rx",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.SIMULATOR,
        driverOptions: [
            "-p",
            "<EW-PATH>/rx/config/debugger/ior5f56107.ddf",
            "--endian",
            "l",
            "--double",
            "32",
            "--core",
            "rxv1",
            "--int",
            "32",
            "--fpu",
            "none"
        ]
    },
    {
        type: "cspy",
        request: "launch",
        name: "Template: Debug with C-SPY E2 Emulator",
        target: "rx",
        program: "${workspaceFolder}/Debug/Exe/ewproj.out",
        stopOnSymbol: "main",
        workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
        projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
        projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
        driver: CSpyDriver.DriverNames.E2LITEEZCUBE,
        driverOptions: [
            "-p",
            "<EW-PATH>/rx/config/debugger/ior5f526tf.ddf",
            "--endian",
            "l",
            "--double",
            "32",
            "--core",
            "rxv3",
            "--int",
            "32",
            "--fpu",
            "32",
            "-d",
            "e2lite",
            "--drv_mode",
            "debugging",
            "--cspybat_inifile",
            "${workspaceFolder}/settings/<PROJECT-NAME>.dnx"
        ]
    },
];
