/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { DebugProtocol } from "@vscode/debugprotocol";
import * as vscode from "vscode";
import { PartialCSpyLaunchRequestArguments } from "./dap/cspyDebug";
import { CustomRequest } from "./dap/customRequest";
import { DebugSessionTracker } from "./debugSessionTracker";
import { SettingsConstants } from "./settingsConstants";

/**
 * Manages the frontend (client) side of the lockstep mode selection for multicore sessions (i.e. toggling whether
 * continue/step/pause actions affect all cores or only the focused one).
 * Provides commands for setting the lockstep mode, and sends the set lockstep mode to the backend (debug adapter)
 * by injecting data into launch configurations and sending custom DAP requests.
 */
export namespace MulticoreLockstepModeFrontend {

    export function initialize(context: vscode.ExtensionContext, sessionTracker: DebugSessionTracker) {
        // When a session starts, we inject the current selection of breakpoint type to the launch config,
        // so that the debugger starts with the correct type.
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", {
            resolveDebugConfiguration(_, config: vscode.DebugConfiguration & PartialCSpyLaunchRequestArguments) {
                // Allow overriding the user setting from launch.json, even if we don't advertise that possibility anywhere
                if (config.multicoreLockstepModeEnabled === undefined) {
                    const lockstepModeEnabled = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION).get<boolean>(SettingsConstants.LOCKSTEP_MODE_ENABLED);
                    config.multicoreLockstepModeEnabled = lockstepModeEnabled;
                }
                return config;
            }
        }));

        const registerCommand = (commandName: string, lockstepModeEnabled: boolean) => {
            context.subscriptions.push(vscode.commands.registerCommand(commandName, () => {
                sessionTracker.runningSessions.forEach(session => {
                    const args: CustomRequest.SetLockstepModeEnabledArgs = { enabled: lockstepModeEnabled };
                    return session.customRequest(CustomRequest.Names.SET_LOCKSTEP_MODE_ENABLED, args);
                });
                const config = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION);
                config.update(SettingsConstants.LOCKSTEP_MODE_ENABLED, lockstepModeEnabled);
            }));
        };
        registerCommand("iar.enableMulticoreLockstepMode", true);
        registerCommand("iar.disableMulticoreLockstepMode", false);

        // This is used in some 'when' clauses in package.json to disable multicore-related commands & buttons when
        // focused on a single-core session.
        context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(async(session) => {
            if (session?.type === "cspy") {
                const response: DebugProtocol.ThreadsResponse["body"] = await session.customRequest("threads");
                vscode.commands.executeCommand("setContext", "iar-debug.sessionIsMulticore", response.threads.length > 1);
            }
        }));

        const lockstepModeEnabled = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION).get<boolean>(SettingsConstants.LOCKSTEP_MODE_ENABLED);
        vscode.commands.executeCommand("setContext", "iar-debug.lockstepEnabled", lockstepModeEnabled);
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(SettingsConstants.MAIN_SECTION + "." + SettingsConstants.LOCKSTEP_MODE_ENABLED)) {
                const lockstepModeEnabled = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION).get<boolean>(SettingsConstants.LOCKSTEP_MODE_ENABLED);
                vscode.commands.executeCommand("setContext", "iar-debug.lockstepEnabled", lockstepModeEnabled);
            }
        });
    }

}
