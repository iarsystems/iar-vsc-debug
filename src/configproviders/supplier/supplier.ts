/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { logger } from "iar-vsc-common/logger";
import * as vscode from "vscode";
import * as path from "path";
import { CSpyLaunchRequestArguments } from "../../dap/cspyDebug";
import { BuildExtensionConfigurationProvider as BuildExtensionConfigurationSupplier } from "./buildExtensionConfigurationSupplier";
import { ConfigResolutionCommon } from "./common";
import { XclConfigurationSupplier as XclConfigurationSupplier } from "./xclConfigurationSupplier";
import { BuildExtensionApi } from "iar-vsc-common/buildExtension";

/**
 * Functions for generating launch.json configurations matching Embedded Workbench projects.
 */
export namespace CSpyConfigurationSupplier {
    export type CspyLaunchJsonConfiguration = vscode.DebugConfiguration & CSpyLaunchRequestArguments;

    export enum ErrorReason {
        /** The IAR Build extension API could not be reached */
        buildExtensionNotInstalled,
        /** No project is selected in the build extension UI */
        noProjectSelected,
        /** No project configuration is selected in the build extension UI */
        noProjectConfigSelected,
        /** The build extension is installed but could not provide any configurations (probably because of an older workench),
         * and there are no .xcl files to fall back on */
        noConfigurationsAvailable,
    }

    /**
     * Returns a debug configuration generated from the project and project configuration selected in the build extension,
     * if possible.
     */
    export async function supplyDefaultLaunchConfig(workspaceFolder?: vscode.WorkspaceFolder):  Promise<CspyLaunchJsonConfiguration | ErrorReason> {
        const buildExtension = await getBuildExtensionApi();
        if (buildExtension === undefined) {
            return ErrorReason.buildExtensionNotInstalled;
        }

        const project = await buildExtension.getSelectedProject();
        if (project === undefined) {
            return ErrorReason.noProjectSelected;
        }
        const config = await buildExtension.getSelectedConfiguration(project);
        if (config === undefined) {
            return ErrorReason.noProjectConfigSelected;
        }

        // First try the more robust thrift-based supplier. Use the xcl-based version as a fallback.
        try {
            const cmds = await buildExtension.getCSpyCommandline(project, config.name);
            if (!cmds) {
                throw new Error("Could not get C-SPY cmdline");
            }
            logger.debug("Got C-SPY command line: " + cmds);
            const partialConfig = BuildExtensionConfigurationSupplier.provideDebugConfigurationFor(cmds, project, config.name, config.target);
            return ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfig, workspaceFolder?.uri.fsPath);
        } catch (e) {
            logger.debug("Failed to generate config from build extension: " + e);
        }
        try {
            const partialConfig = XclConfigurationSupplier.provideDebugConfigurationFor(project, config.name);
            return ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfig, workspaceFolder?.uri.fsPath);
        } catch (e) {
            logger.debug("Failed to generate config from .xcl files: " + e);
        }
        return ErrorReason.noConfigurationsAvailable;
    }

    /**
     * Generates all possible debug configurations (from projects in the given workspace).
     */
    export async function supplyAllLaunchConfigsFor(workspaceFolder?: vscode.WorkspaceFolder):  Promise<CspyLaunchJsonConfiguration[] | ErrorReason> {
        const buildExtension = await getBuildExtensionApi();
        if (buildExtension === undefined) {
            return ErrorReason.buildExtensionNotInstalled;
        }

        const project = await buildExtension.getSelectedProject();
        if (project === undefined) {
            return ErrorReason.noProjectSelected;
        }
        if (vscode.workspace.getWorkspaceFolder(vscode.Uri.file(project)) !== workspaceFolder) {
            return [];
        }

        let result: CspyLaunchJsonConfiguration[] = [];

        // First try the more robust thrift-based supplier. Use the xcl-based version as a fallback.
        try {
            const configs = await buildExtension.getProjectConfigurations(project);
            if (configs) {
                result = await Promise.all(configs.map(async(conf) => {
                    const cmds = await buildExtension.getCSpyCommandline(project, conf.name);
                    if (!cmds) {
                        throw new Error("Could not get C-SPY cmdline");
                    }
                    logger.debug("Got C-SPY command line: " + cmds);
                    const partialConfig = BuildExtensionConfigurationSupplier.provideDebugConfigurationFor(cmds, project, conf.name, conf.target);
                    return ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfig, workspaceFolder?.uri.fsPath);
                }));
            }
        } catch (e) {
            logger.debug("Failed to generate config from build extension: " + e);
        }

        if (result.length === 0) {
            try {
                const partialConfigs = XclConfigurationSupplier.provideDebugConfigurations(workspaceFolder, path.dirname(project));
                result = partialConfigs.map(config => ConfigResolutionCommon.toLaunchJsonConfiguration(config, workspaceFolder?.uri.fsPath));
            } catch (e) {
                logger.debug("Failed to generate config from .xcl files: " + e);
            }
        }

        if (result.length > 0) {
            return result.flatMap(config => [
                {
                    ...config,
                    name: "Launch: " + config.name
                },
                {
                    ...config,
                    request: "attach",
                    name: "Attach: " + config.name,
                }
            ]);
        }
        return ErrorReason.noConfigurationsAvailable;
    }

    export function toErrorMessage(reason: CSpyConfigurationSupplier.ErrorReason): string {
        switch (reason) {
        case CSpyConfigurationSupplier.ErrorReason.buildExtensionNotInstalled:
            return "IAR: Unable to provide automatic debug configurations: The IAR Build extension is not installed.";
        case CSpyConfigurationSupplier.ErrorReason.noConfigurationsAvailable:
            return "IAR: Unable to provide automatic debug configuration(s): Please debug the project in Embedded Workbench once and then try again.";
        case CSpyConfigurationSupplier.ErrorReason.noProjectSelected:
            return "IAR: Unable to provide automatic debug configuration(s): Please select a project in the IAR Build extension.";
        case CSpyConfigurationSupplier.ErrorReason.noProjectConfigSelected:
            return "IAR: Unable to provide automatic debug configuration(s): Please select a project configuration in the IAR Build extension.";
        default:
            return "IAR: Unable to provide automatic debug configurations: An unknown error occured.";
        }
    }

    let api: BuildExtensionApi | undefined = undefined;
    async function getBuildExtensionApi(): Promise<BuildExtensionApi | undefined> {
        if (api !== undefined) {
            return api;
        }
        const buildExtension = vscode.extensions.getExtension("iarsystems.iar-build");
        if (!buildExtension) {
            return undefined;
        }
        await buildExtension.activate();
        api = buildExtension.exports;
        return api;
    }
    // Exposed for testing purposes
    export function setMockApi(mock: BuildExtensionApi) {
        api = mock;
    }
}