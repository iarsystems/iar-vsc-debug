/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { BreakpointType } from "./dap/breakpoints/cspyBreakpointService";
import { CSpyLaunchRequestArguments } from "./dap/cspyDebug";
import { CustomRequest } from "./dap/customRequest";
import { DebugSessionTracker } from "./debugSessionTracker";
import { SettingsConstants } from "./settingsConstants";

/**
 * Manages the frontend (client) side of the breakpoint type selection (auto, hardware or software).
 * Provides commands for setting the breakpoint type, and sends the set breakpoint type to the backend (debug adapter)
 * by injecting data into launch configurations and sending custom DAP requests.
 */
export namespace BreakpointTypesFrontend {

    export function initialize(context: vscode.ExtensionContext, sessionTracker: DebugSessionTracker) {
        // When a session starts, we inject the current selection of breakpoint type to the launch config,
        // so that the debugger starts with the correct type.
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", {
            resolveDebugConfiguration(_, config: vscode.DebugConfiguration & Partial<CSpyLaunchRequestArguments>) {
                // Allow overriding the user setting from launch.json, even if we don't advertise that possibility anywhere
                if (!config.breakpointType) {
                    const bpType = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION).get(SettingsConstants.BREAKPOINT_TYPE);
                    const actualType = bpType === SettingsConstants.BreakpointTypeValue.HARDWARE ? BreakpointType.HARDWARE :
                        bpType === SettingsConstants.BreakpointTypeValue.SOFTWARE ? BreakpointType.SOFTWARE : BreakpointType.AUTO;
                    config.breakpointType = actualType;
                }
                return config;
            }
        }));

        const registerCommand = (commandName: string, dapRequest: CustomRequest.Names, breakpointType: SettingsConstants.BreakpointTypeValue) => {
            context.subscriptions.push(vscode.commands.registerCommand(commandName, () => {
                // Tell all active sessions to change breakpoint type, and then store the choice in user settings
                sessionTracker.runningSessions.forEach(session => session.customRequest(dapRequest));
                const config = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION);
                config.update(SettingsConstants.BREAKPOINT_TYPE, breakpointType);

                // IF there is a session running, the user will get feedback from the console, but otherwise
                // we give some feedback here.
                if (sessionTracker.runningSessions.length === 0) {
                    vscode.window.showInformationMessage(`Now using ${breakpointType} breakpoints.`);
                }
            }));
        };
        registerCommand("iar.useAutoBreakpoints", CustomRequest.Names.USE_AUTO_BREAKPOINTS, SettingsConstants.BreakpointTypeValue.AUTO);
        registerCommand("iar.useHardwareBreakpoints", CustomRequest.Names.USE_HARDWARE_BREAKPOINTS, SettingsConstants.BreakpointTypeValue.HARDWARE);
        registerCommand("iar.useSoftwareBreakpoints", CustomRequest.Names.USE_SOFTWARE_BREAKPOINTS, SettingsConstants.BreakpointTypeValue.SOFTWARE);

        const registerSessionLocalCommand = (commandName: string, dapRequest: CustomRequest.Names) => {
            context.subscriptions.push(vscode.commands.registerCommand(commandName, () => {
                // These commands only affect the active session, and changes are not stored
                if (vscode.debug.activeDebugSession?.type === "cspy") {
                    vscode.debug.activeDebugSession.customRequest(dapRequest);
                }
            }));
        };
        registerSessionLocalCommand("iar.useAutoBreakpointsActive", CustomRequest.Names.USE_AUTO_BREAKPOINTS);
        registerSessionLocalCommand("iar.useHardwareBreakpointsActive", CustomRequest.Names.USE_HARDWARE_BREAKPOINTS);
        registerSessionLocalCommand("iar.useSoftwareBreakpointsActive", CustomRequest.Names.USE_SOFTWARE_BREAKPOINTS);

        // Not all sessions can handle all types, depending on the driver. This will deactivate commands when they are
        // not supported (see the 'when' clauses in package.json).
        context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(async(session) => {
            if (session?.type === "cspy") {
                const supportedTypes: CustomRequest.BreakpointTypesResponse = await session.customRequest(CustomRequest.Names.GET_BREAKPOINT_TYPES);
                vscode.commands.executeCommand("setContext", "iar-debug.noAutoBreakpoints", !supportedTypes.includes(BreakpointType.AUTO));
                vscode.commands.executeCommand("setContext", "iar-debug.noHardwareBreakpoints", !supportedTypes.includes(BreakpointType.HARDWARE));
                vscode.commands.executeCommand("setContext", "iar-debug.noSoftwareBreakpoints", !supportedTypes.includes(BreakpointType.SOFTWARE));
            }
        }));
    }
}