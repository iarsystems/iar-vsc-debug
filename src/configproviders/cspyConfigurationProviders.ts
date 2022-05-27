/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Workbench } from "iar-vsc-common/workbench";
import * as vscode from "vscode";
import { CSpyConfigurationSupplier as LaunchConfigurationSupplier } from "./supplier/supplier";

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
 * Like ${@link CSpyConfigurationsProvider}, but shows a quickpick to let the user choose a single launch.json configuration.
 * The list includes "template" configurations which can serve as starting points writing custom configurations.
 */
export class InitialCSpyConfigurationProvider implements vscode.DebugConfigurationProvider {

    async provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, _?: vscode.CancellationToken): Promise<LaunchConfigurationSupplier.CspyLaunchJsonConfiguration[] | undefined> {
        const supplierResult = await LaunchConfigurationSupplier.supplyAllLaunchConfigsFor(folder);
        const templates = TEMPLATES["arm"] ?? [];
        if (typeof supplierResult === "number") {
            vscode.window.showErrorMessage(LaunchConfigurationSupplier.toErrorMessage(supplierResult));
        } else {
            const options: Array<vscode.QuickPickItem & {launchConfig?: LaunchConfigurationSupplier.CspyLaunchJsonConfiguration}>
                = supplierResult.map(launchConfig => {
                    return { label: launchConfig.name, description: launchConfig.driver, launchConfig };
                });
            if (templates.length > 0) {
                options.push({ label: "Templates", kind: vscode.QuickPickItemKind.Separator });
                templates.forEach(template => options.push({ label: template.name, description: Workbench.getTargetDisplayName(template.target) + " template", launchConfig: template }));
            }
            const choice = await vscode.window.showQuickPick(options, { title: "Select initial launch.json configuration" });
            // TODO:
            if (choice?.launchConfig) {
                return [choice.launchConfig];
            } else {
                const fallbackChoice = supplierResult[0] ?? templates[0];
                return fallbackChoice ? [fallbackChoice] : undefined;
            }
        }
        return templates[0] ? [templates[0]] : undefined;
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

const TEMPLATES: Record<string, LaunchConfigurationSupplier.CspyLaunchJsonConfiguration[]> = {
    "arm": [
        {
            type: "cspy",
            request: "launch",
            name: "Template: Debug with C-SPY simulator",
            target: "arm",
            program: "${workspaceFolder}/Debug/Exe/ewproj.out",
            stopOnEntry: true,
            workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
            projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
            projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
            driver: "sim2",
            driverOptions: [
                "--endian=little",
                "--cpu=<CPU_NAME>",
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
            stopOnEntry: true,
            workbenchPath: "${command:iar-config.toolchain} for an iar-build project or path to EW root.",
            projectPath: "${command:iar-config.project-file} for an iar-build project or ${workspaceFolder} otherwise.",
            projectConfiguration: "${command:iar-config.project-configuration} for an iar-build project. Remove this for other project types.",
            driver: "jet",
            driverOptions: [
                "--endian=little",
                "--cpu=<CPU-NAME>",
                "--fpu=<FPU-NAME>",
                "-p",
                "<EW-PATH>/arm/CONFIG/debugger/<PATH-TO-.ddf>",
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
                    "<EW-PATH>/arm/CONFIG/debugger/<PATH-TO-.dmac>"
                ]
            }
        }

    ]
};
