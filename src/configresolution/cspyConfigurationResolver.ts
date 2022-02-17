import * as vscode from "vscode";
import { BuildExtensionChannel } from "./buildExtensionChannel";
import { XclConfigurationProvider } from "./xclConfigurationProvider";

/**
 * For empty debug configurations, tries to provide a full debug configuration
 * based on the project selected in the build extension (if installed).
 */
export class CSpyConfigurationResolver implements vscode.DebugConfigurationProvider {

    async resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        debugConfiguration: vscode.DebugConfiguration,
        __?: vscode.CancellationToken
    ): Promise<vscode.DebugConfiguration | undefined> {
        // Handle empty or non-existant launches
        if (!debugConfiguration.type && !debugConfiguration.request && !debugConfiguration.name) {
            if (folder === undefined) {
                throw new Error("Can not start a debug session without an open folder.");
            }
            const project = await BuildExtensionChannel.getInstance()?.getLoadedProject();
            const config = await BuildExtensionChannel.getInstance()?.getSelectedConfiguration();
            if (project === undefined || config === undefined) {
                throw new Error("Could not find a project and configuration to launch.");
            }
            debugConfiguration = XclConfigurationProvider.provideDebugConfigurationFor(folder, project, config);
        }
        return debugConfiguration;

    }
}