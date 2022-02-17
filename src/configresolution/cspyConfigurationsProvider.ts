import * as vscode from "vscode";
import * as path from "path";
import { XclConfigurationProvider } from "./xclConfigurationProvider";
import { BuildExtensionChannel } from "./buildExtensionChannel";

/**
 * Provides automatic debug configurations from a folder containing .ewp projects
 */
export class CSpyConfigurationsProvider implements vscode.DebugConfigurationProvider {

    async provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, _?: vscode.CancellationToken): Promise<vscode.DebugConfiguration[]> {
        if (folder !== undefined) {
            const project = await BuildExtensionChannel.getInstance()?.getLoadedProject();
            if (project !== undefined) {
                return XclConfigurationProvider.provideDebugConfigurations(folder, path.dirname(project));
            }
        }
        return [];
    }
}