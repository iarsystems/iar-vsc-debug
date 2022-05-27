/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as vscode from "vscode";
import { CSpyDebugSession } from "./dap/cspyDebug";
import { DebugSessionTracker } from "./debugSessionTracker";
import { BreakpointCommands } from "./breakpointCommands";
import { DefaultCSpyConfigurationResolver, CSpyConfigurationsProvider, InitialCSpyConfigurationProvider } from "./configproviders/cspyConfigurationProviders";
import { SettingsConstants } from "./settingsConstants";
import { BreakpointType } from "./dap/breakpoints/cspyBreakpointManager";
import { CustomRequest, RegistersResponse } from "./dap/customRequest";
import { logger } from "iar-vsc-common/logger";

let sessionTracker: DebugSessionTracker | undefined;

export function activate(context: vscode.ExtensionContext) {
    logger.init("IAR C-SPY Debug");
    logger.debug("Activating extension");
    // register a configuration provider for 'cspy' debug type
    vscode.debug.registerDebugAdapterDescriptorFactory("cspy", {
        createDebugAdapterDescriptor(_session: vscode.DebugSession, _executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
            return new vscode.DebugAdapterInlineImplementation(new CSpyDebugSession());
        }
    });

    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", new InitialCSpyConfigurationProvider(), vscode.DebugConfigurationProviderTriggerKind.Initial));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", new CSpyConfigurationsProvider(), vscode.DebugConfigurationProviderTriggerKind.Dynamic));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", new DefaultCSpyConfigurationResolver()));

    sessionTracker = new DebugSessionTracker(context);
    BreakpointCommands.registerCommands(context, sessionTracker);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", {
        resolveDebugConfiguration(_, config) {
            // Pass along the user's selection of breakpoint type to the adapter
            // Allow overriding the user setting from launch.json, even if we don't advertise that possibility anywhere
            if (!config["breakpointType"]) {
                const bpType = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION).get(SettingsConstants.BREAKPOINT_TYPE);
                const actualType = bpType === SettingsConstants.BreakpointTypeValues.HARDWARE ? BreakpointType.HARDWARE :
                    bpType === SettingsConstants.BreakpointTypeValues.SOFTWARE ? BreakpointType.SOFTWARE : BreakpointType.AUTO;
                config["breakpointType"] = actualType;
            }
            return config;
        }
    }));

    // Generate and locate an svd for the session, so that the register view is populated
    vscode.debug.onDidStartDebugSession(async(session) => {
        if (session.type === "cspy") {
            const ext = vscode.extensions.getExtension("ms-vscode.vscode-embedded-tools");
            if (!ext) {
                return;
            }
            const activation = ext.activate();
            const response: RegistersResponse = await session.customRequest(CustomRequest.REGISTERS);
            await activation;
            if (response.svdContent) {
                ext.exports.setSvdSource({ source: "inline", content: response.svdContent });
            } else {
                ext.exports.setSvdSource({ source: "fromFile" });
            }
        }
    });
}

export function deactivate() {
    logger.debug("Deactivating extension");
}
