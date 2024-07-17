/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as vscode from "vscode";
import { CSpyDebugSession } from "./dap/cspyDebug";
import { DebugSessionTracker } from "./debugSessionTracker";
import { BreakpointTypesFrontend } from "./breakpointTypesFrontend";
import { DefaultCSpyConfigurationResolver, CSpyConfigurationsProvider, InitialCSpyConfigurationProvider } from "./configproviders/cspyConfigurationProviders";
import { CustomRequest } from "./dap/customRequest";
import { logger } from "iar-vsc-common/logger";
import { DialogService } from "./dialogService";
import { MulticoreLockstepModeFrontend } from "./multicoreLockstepModeFrontend";
import { MockListwindow } from "./listwindows/mockListwindow";
import { LiveWatchListwindow } from "./listwindows/liveWatchListwindow";
import { TestListwindow } from "./listwindows/testListwindow";

let sessionTracker: DebugSessionTracker | undefined;
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

    context.subscriptions.push(new LiveWatchListwindow(context.extensionUri));
    if (context.extensionMode === vscode.ExtensionMode.Development) {
        context.subscriptions.push(new MockListwindow(context.extensionUri));
        vscode.commands.executeCommand("setContext", "iar-debug.showMockView", true);
    } else {
        testListwindow = new TestListwindow(context.extensionUri);
        context.subscriptions.push(testListwindow);
        vscode.commands.executeCommand("setContext", "iar-debug.showTestView", true);
    }

    sessionTracker = new DebugSessionTracker(context);
    MulticoreLockstepModeFrontend.initialize(context, sessionTracker);
    BreakpointTypesFrontend.initialize(context, sessionTracker);

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
