/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as vscode from "vscode";
import { CSpyDebugSession } from "./dap/cspyDebug";
import { DebugSessionTracker } from "./debugSessionTracker";
import { BreakpointModesFrontend } from "./breakpointModesFrontend";
import { DefaultCSpyConfigurationResolver, CSpyConfigurationsProvider, InitialCSpyConfigurationProvider, PartialCSpyConfigurationProvider } from "./configproviders/cspyConfigurationProviders";
import { CustomRequest } from "./dap/customRequest";
import { logger } from "iar-vsc-common/logger";
import { DialogService } from "./dialogService";
import { MulticoreLockstepModeFrontend } from "./multicoreLockstepModeFrontend";
import { MockListwindow } from "./listwindows/mockListwindow";
import { TestListwindow } from "./listwindows/testListwindow";
import { ListwindowManager } from "./listwindows/windowManager";
import { ThemeProvider } from "./listwindows/themeProvider";
import { ContextChangedHandler } from "./contextChangedHandler";
import { CustomCommandsFrontend } from "./customCommandsFrontend";

let sessionTracker: DebugSessionTracker | undefined;
export let listwindowManager: ListwindowManager | undefined;

// A special listwindow for tests
export let testListwindow: TestListwindow | undefined = undefined;

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
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", new PartialCSpyConfigurationProvider(), vscode.DebugConfigurationProviderTriggerKind.Initial));

    listwindowManager = new ListwindowManager(context);

    if (context.extensionMode === vscode.ExtensionMode.Development) {
        const mockWindow = new MockListwindow(context.extensionUri);
        context.subscriptions.push(mockWindow);
    } else if (context.extensionMode === vscode.ExtensionMode.Test) {
        testListwindow = new TestListwindow(context.extensionUri);
        context.subscriptions.push(testListwindow);
    }

    context.subscriptions.push(new ThemeProvider());

    sessionTracker = new DebugSessionTracker(context);
    MulticoreLockstepModeFrontend.initialize(context, sessionTracker);
    BreakpointModesFrontend.initialize(context, sessionTracker);
    ContextChangedHandler.initialize();
    CustomCommandsFrontend.initialize(context, sessionTracker);

    // Generate and locate an svd for the session, so that the register view is populated
    vscode.debug.onDidChangeActiveDebugSession(async(session) => {
        if (session?.type === "cspy") {

            const ext = vscode.extensions.getExtension("ms-vscode.vscode-embedded-tools");
            if (!ext) {
                return;
            }
            const activation = ext.activate();
            const response: CustomRequest.RegistersResponse = await session.customRequest(CustomRequest.Names.REGISTERS);
            await activation;
            if (response.svdContent) {
                ext.exports.setSvdSource({ source: "inline", content: response.svdContent });
            } else {
                ext.exports.setSvdSource({ source: "fromFile" });
            }
        }
    });
    DialogService.initialize(context);
}

export function deactivate() {
    logger.debug("Deactivating extension");
    DialogService.dispose();
}
