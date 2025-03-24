/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { PartialCSpyLaunchRequestArguments } from "./dap/cspyDebug";
import { CustomEvent, CustomRequest } from "./dap/customRequest";
import { DebugSessionTracker } from "./debugSessionTracker";
import { SettingsConstants } from "./settingsConstants";
import { CodeBreakpointMode } from "./dap/breakpoints/breakpointMode";
import { DebugProtocol } from "@vscode/debugprotocol";

/**
 * Manages the frontend (client) side of the breakpoint mode selection (see
 * {@link CodeBreakpointMode}).
 * Provides commands for setting the breakpoint mode, and sends the set
 * breakpoint mode to the backend (debug adapter) by injecting data into launch
 * configurations and sending custom DAP requests.
 */
export namespace BreakpointModesFrontend {
    /** For each {@link CodeBreakpointMode}, lists:
     *  * The name of the corresponding option in the extension settings
     *  * The name of the command used to activate the mode
     *  * The name of the context key used to control the enablement of the command
     * This must be kept in sync with the package.json entries
     */
    const bpModeSettingsAndCommands: Array<[CodeBreakpointMode, string, string, string]> = [
        [CodeBreakpointMode.Auto,        "Auto",         "iar.useAutoBreakpoints",        "iar-debug.autoBreakpointsSupported"],
        [CodeBreakpointMode.Hardware,    "Hardware",     "iar.useHardwareBreakpoints",    "iar-debug.hardwareBreakpointsSupported"],
        [CodeBreakpointMode.Software,    "Software",     "iar.useSoftwareBreakpoints",    "iar-debug.softwareBreakpointsSupported"],
        [CodeBreakpointMode.TraceStart,  "Trace Start",  "iar.useTraceStartBreakpoints",  "iar-debug.traceStartBreakpointsSupported"],
        [CodeBreakpointMode.TraceStop,   "Trace Stop",   "iar.useTraceStopBreakpoints",   "iar-debug.traceStopBreakpointsSupported"],
        [CodeBreakpointMode.TraceFilter, "Trace Filter", "iar.useTraceFilterBreakpoints", "iar-debug.traceFilterBreakpointsSupported"],
        [CodeBreakpointMode.Flash,       "Flash",        "iar.useFlashBreakpoints",       "iar-debug.flashBreakpointsSupported"],
        [CodeBreakpointMode.TimerStart,  "Timer Start",  "iar.useTimerStartBreakpoints",  "iar-debug.timerStartBreakpointsSupported"],
        [CodeBreakpointMode.TimerStop,   "Timer Stop",   "iar.useTimerStopBreakpoints",   "iar-debug.timerStopBreakpointsSupported"],
    ];


    export function initialize(context: vscode.ExtensionContext, sessionTracker: DebugSessionTracker) {
        // When a session starts, we inject the current selection of breakpoint mode to the launch config,
        // so that the debugger starts with the correct type.
        context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", {
            resolveDebugConfiguration(_, config: vscode.DebugConfiguration & PartialCSpyLaunchRequestArguments) {
                // Allow overriding the user setting from launch.json, even if we don't advertise that possibility anywhere
                if (!config.breakpointMode) {
                    const bpModeSetting = vscode.workspace.
                        getConfiguration(SettingsConstants.MAIN_SECTION).
                        get<string>(SettingsConstants.BREAKPOINT_MODE);
                    if (bpModeSetting) {
                        const bpMode = settingValueToBreakpointMode(bpModeSetting);
                        config.breakpointMode = bpMode;
                    }
                }
                return config;
            }
        }));

        context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {
            if (ev.event === CustomEvent.Names.MISSING_BREAKPOINTS) {
                // Map the breakpoints from dap to vscode.
                const bps: vscode.Breakpoint[] = [];
                const body = ev.body as CustomEvent.MissingBreakpoints;

                // Map all breakpoints from the protocol type to vscode ones.
                switch (body.type) {
                    case "source": {
                        const sourceBps = body.breakpoints as DebugProtocol.SourceBreakpoint[];
                        const fileUri = vscode.Uri.file(body.srcPath?? "");
                        sourceBps.forEach(bp => {
                            const pos = new vscode.Position(bp.line - 1, bp.column ?? 0);
                            const location = new vscode.Location(fileUri, pos);
                            const vscBp = new vscode.SourceBreakpoint(location, true, bp.condition);
                            bps.push(vscBp);
                        });
                        break;
                    }
                    // VsCode does not currently support settings these two, so just ignore them for now.
                    case "data":
                    case "instruction":
                    {
                        break;
                    }
                }

                vscode.debug.addBreakpoints(bps);
            }
        }));

        const registerCommand = (commandName: string, breakpointMode: CodeBreakpointMode, settingValue: string) => {
            context.subscriptions.push(vscode.commands.registerCommand(commandName, () => {
                // Tell all active sessions to change breakpoint mode, and then store the choice in user settings
                const args: CustomRequest.SetBreakpointModeArgs = breakpointMode;
                sessionTracker.runningSessions.forEach(
                    session => session.customRequest(CustomRequest.Names.SET_BREAKPOINT_MODE, args));

                const config = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION);
                config.update(SettingsConstants.BREAKPOINT_MODE, settingValue);

                // IF there is a session running, the user will get feedback from the console, but otherwise
                // we give some feedback here.
                if (sessionTracker.runningSessions.length === 0) {
                    vscode.window.showInformationMessage(`Now using ${settingValue} breakpoints.`);
                }
            }));
        };

        context.subscriptions.push(vscode.commands.registerCommand("iar.clearAllBreakpoints", () => {
            // Clear all breakpoints using the vscode API's
            vscode.debug.removeBreakpoints(vscode.debug.breakpoints);

            // For each session, try to remove any remaining ones. This tries to delete all breakpoints
            // from the backend as well.
            sessionTracker.runningSessions.forEach(session => {
                session.customRequest("setBreakpoints", {arguments: {breakpoints: []}});
                session.customRequest("setDataBreakpoints", {arguments: {breakpoints: []}});
                session.customRequest("setInstructionBreakpoints", {arguments: {breakpoints: []}});
                session.customRequest("setFunctionBreakpoints", {arguments: {breakpoints: []}});
            });
        }));


        const registerSessionLocalCommand = (commandName: string, breakpointMode: CodeBreakpointMode) => {
            context.subscriptions.push(vscode.commands.registerCommand(commandName, () => {
                // These commands only affect the active session, and changes are not stored
                if (vscode.debug.activeDebugSession?.type === "cspy") {
                    const args: CustomRequest.SetBreakpointModeArgs = breakpointMode;
                    vscode.debug.activeDebugSession.customRequest(CustomRequest.Names.SET_BREAKPOINT_MODE, args);
                }
            }));
        };

        for (const [mode, settingValue, commandName] of bpModeSettingsAndCommands) {
            registerCommand(commandName, mode, settingValue);
            registerSessionLocalCommand(commandName + "Active", mode);
        }
        // Not all sessions can handle all types, depending on the driver. This will deactivate commands when they are
        // not supported (see the 'when' clauses in package.json).
        context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(async(session) => {
            if (session?.type === "cspy") {
                const supportedModes: CustomRequest.GetBreakpointModesResponse = await session.customRequest(CustomRequest.Names.GET_BREAKPOINT_MODES);
                for (const [mode, , , contextKey] of bpModeSettingsAndCommands) {
                    vscode.commands.executeCommand("setContext", contextKey, supportedModes.includes(mode));
                }
            }
        }));
    }

    function settingValueToBreakpointMode(settingValue: string): CodeBreakpointMode | undefined {
        return bpModeSettingsAndCommands.find(([, name, ]) => name === settingValue)?.[0];
    }
}