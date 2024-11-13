/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { PartialCSpyLaunchRequestArguments } from "./dap/cspyDebug";
import { BuildExtensionApi } from "iar-vsc-common/buildExtension";
import { logger } from "iar-vsc-common/logger";
import { SettingsConstants } from "./settingsConstants";

/**
 * Handles the 'buildBeforeDebugging' launch.json option, by jacking into the
 * configuration resolution process to ask the build extension to build the project.
 */
export namespace BuildBeforeDebugging {
    export function initialize(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.debug.registerDebugConfigurationProvider("cspy", {
                async resolveDebugConfigurationWithSubstitutedVariables(
                    _,
                    config: Readonly<vscode.DebugConfiguration &
                        PartialCSpyLaunchRequestArguments>,
                ) {
                    if (!config.projectPath || !config.projectConfiguration) {
                        return config;
                    }
                    await doPrebuild(
                        config.projectPath,
                        config.projectConfiguration,
                        config.buildBeforeDebugging,
                    );
                    return config;
                },
            }),
        );
    }

    async function doPrebuild(projectPath: string, configuration: string, buildMode: string | undefined): Promise<void> {
        if (!buildMode) {
            buildMode =
                vscode.workspace.
                    getConfiguration(
                        SettingsConstants.MAIN_SECTION,
                    ).
                    get<string>(
                        SettingsConstants.BUILD_BEFORE_DEBUGGING,
                    ) ?? SettingsConstants.BuildBeforeDebuggingValue.Disabled;
        }

        if (buildMode === SettingsConstants.BuildBeforeDebuggingValue.Disabled) {
            return;
        }
        const api: BuildExtensionApi | undefined =
            vscode.extensions.getExtension(
                "iarsystems.iar-build",
            )?.exports;
        if (!api) {
            logger.warn(
                "Cannot build project, IAR Build extension is not installed",
            );
            return;
        }

        try {
            await api.buildProject(
                projectPath,
                configuration,
            );
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            switch (buildMode) {
                case SettingsConstants.BuildBeforeDebuggingValue.
                    AbortOnFailure:
                    throw new Error(
                        `Failed to build project: ${errMsg}`,
                    );
                case SettingsConstants.BuildBeforeDebuggingValue.
                    DebugAnywayOnFailure:
                    break;
                case SettingsConstants.BuildBeforeDebuggingValue.
                    AskOnFailure: {
                    const response =
                        await vscode.window.showWarningMessage(
                            "Failed to build project. Do you want to debug anyway?",
                            { modal: true, detail: errMsg },
                            "Debug Anyway",
                        );
                    if (response !== "Debug Anyway") {
                        throw new Error(
                            `Failed to build project: ${errMsg}`,
                        );
                    }
                    break;
                }
            }
        }
    }
}
