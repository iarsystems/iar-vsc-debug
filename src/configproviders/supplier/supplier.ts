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
import { SettingsConstants } from "../../settingsConstants";

/**
 * Functions for generating launch.json configurations matching Embedded Workbench projects.
 */
export namespace CSpyConfigurationSupplier {
    export type CspyLaunchJsonConfiguration = vscode.DebugConfiguration & Partial<CSpyLaunchRequestArguments>;

    export enum ErrorReason {
        /** The IAR Build extension API could not be reached */
        buildExtensionNotInstalled,
        /** No project is selected in the build extension UI */
        noProjectSelected,
        /** No project configuration is selected in the build extension UI */
        noProjectConfigSelected,
        /** The build extension is installed but could not provide any configurations (probably because of an older workbench),
         * and there are no .xcl files to fall back on */
        noConfigurationsAvailable,
        /** Failed to detemine the target, either from option or from build extension API*/
        noTargetSpecified,
    }

    /**
     * Generate a launch configuration based for the given project and configuration which
     * uses the given workbench. If target is omitted, tries to resolve it from the build
     * extension.
     * @param workbenchPath Path to the workbench to use.
     * @param projectPath   Absolute path to the project
     * @param configuration Name the configuration
     * @param target        Name of the target, e.g., ARM.
     * @returns
     */
    export async function supplyDefaultLaunchConfigForProject(
        workbenchPath: string,
        projectPath: string,
        configuration: string,
        target?: string
    ): Promise<CspyLaunchJsonConfiguration | ErrorReason> {
        const buildExtension = await getBuildExtensionApi();
        if (buildExtension === undefined) {
            return ErrorReason.buildExtensionNotInstalled;
        }

        let wantedTarget = target;
        if (!target) {
            const configs =
                await buildExtension.getProjectConfigurations(projectPath);
            const projectConfig = configs?.find(c => {
                return c.name === configuration;
            });
            wantedTarget = projectConfig?.target;
        }

        if (wantedTarget) {
            const commands = await collectCSpyCommandline(
                buildExtension,
                projectPath,
                configuration,
                wantedTarget,
                workbenchPath,
            );
            if (typeof commands !== "number") {
                //Replace this with the wanted path.
                commands.workbenchPath = workbenchPath;
            }
            return commands;
        }
        return ErrorReason.noTargetSpecified;
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

        const workbenchPath = await buildExtension.getSelectedWorkbench();

        return collectCSpyCommandline(
            buildExtension,
            project,
            config.name,
            config.target,
            workbenchPath,
            workspaceFolder
        );
    }

    export async function collectCSpyCommandline(
        buildExtension: BuildExtensionApi,
        project: string,
        config: string,
        target: string,
        workbenchPath?: string,
        wsDir?: vscode.WorkspaceFolder
    ): Promise<CspyLaunchJsonConfiguration | ErrorReason> {
        try {
            const timeout = new Promise<undefined>((_, reject) => {
                setTimeout(() => {
                    reject(
                        new Error("Timeout while collecting cspy commandline"),
                    );
                }, 10000);
            });
            const cmds = await Promise.race([
                timeout,
                buildExtension.getCSpyCommandline(project, config),
            ]);
            if (!cmds) {
                throw new Error("Could not get C-SPY cmdline");
            }
            logger.debug("Got C-SPY command line: " + cmds);
            const partialConfig =
                BuildExtensionConfigurationSupplier.provideDebugConfigurationFor(
                    cmds,
                    project,
                    config,
                    target,
                );
            const debugConfig =
                ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfig, wsDir?.uri.path, workbenchPath, getBuildBeforeDebuggingValue());
            return debugConfig;
        } catch (e) {
            logger.debug(
                "Failed to generate config from build extension: " + e,
            );
        }
        try {
            const partialConfig =
                XclConfigurationSupplier.provideDebugConfigurationFor(
                    project,
                    config,
                );
            const debugConfig =
                ConfigResolutionCommon.toLaunchJsonConfiguration(partialConfig, wsDir?.uri.path, workbenchPath, getBuildBeforeDebuggingValue());
            return debugConfig;
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

        const workbenchPath = await buildExtension.getSelectedWorkbench();

        let result: CspyLaunchJsonConfiguration[] = [];

        // First try the more robust thrift-based supplier. Use the xcl-based version as a fallback.
        try {
            const configs = await buildExtension.getProjectConfigurations(project);
            if (configs) {
                const generated = await Promise.allSettled(configs.map(async(conf) => {
                    const cmds = await buildExtension.getCSpyCommandline(project, conf.name);
                    if (!cmds) {
                        throw new Error("Could not get C-SPY cmdline");
                    }
                    logger.debug("Got C-SPY command line: " + cmds);
                    const partialConfig = BuildExtensionConfigurationSupplier.provideDebugConfigurationFor(cmds, project, conf.name, conf.target);
                    return ConfigResolutionCommon.toLaunchJsonConfiguration(
                        partialConfig,
                        workspaceFolder?.uri.fsPath,
                        workbenchPath,
                        getBuildBeforeDebuggingValue());
                }));
                generated.forEach(res => {
                    if (res.status === "fulfilled") {
                        result.push(res.value);
                    } else {
                        logger.debug(`Failed to generate config from build extension: ` + res.reason);
                    }
                });
            }
        } catch (e) {
            logger.debug("Failed to generate config from build extension: " + e);
        }

        if (result.length === 0) {
            try {
                const partialConfigs = XclConfigurationSupplier.provideDebugConfigurations(workspaceFolder, path.dirname(project));
                result = partialConfigs.map(config => ConfigResolutionCommon.toLaunchJsonConfiguration(
                    config,
                    workspaceFolder?.uri.fsPath,
                    workbenchPath,
                    getBuildBeforeDebuggingValue()));
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
                    stopOnEntry: undefined,
                    stopOnSymbol: undefined,
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
            case CSpyConfigurationSupplier.ErrorReason.noTargetSpecified:
                return `IAR: Unable to provide automatic debug configuration(s):
                       Please add the "target" entry to the partial configuration or
                       set the project as active.`;
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

    function getBuildBeforeDebuggingValue(): SettingsConstants.BuildBeforeDebuggingValue | undefined {
        return vscode.workspace.
            getConfiguration(SettingsConstants.MAIN_SECTION).
            get<SettingsConstants.BuildBeforeDebuggingValue>(SettingsConstants.BUILD_BEFORE_DEBUGGING);
    }
}