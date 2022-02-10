import * as vscode from "vscode";
import * as path from "path";
import { BuildExtensionInteraction } from "./buildExtensionInteraction";
import { XclConfigurationProvider } from "./xclConfigurationProvider";

/**
 * Provides automatic debug configurations from a folder containing .ewp projects
 */
export class CSpyConfigurationsProvider implements vscode.DebugConfigurationProvider {

    /**
     * Provides [debug configuration](#DebugConfiguration) to the debug service. If more than one debug configuration provider is
     * registered for the same type, debug configurations are concatenated in arbitrary order.
     *
     * @param folder The workspace folder for which the configurations are used or `undefined` for a folderless setup.
     * @param token A cancellation token.
     * @return An array of [debug configurations](#DebugConfiguration).
     */
    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, _?: vscode.CancellationToken): vscode.DebugConfiguration[] {
        if (folder !== undefined) {
            const project = BuildExtensionInteraction.getSelectedProject(folder);
            if (project !== undefined) {
                return XclConfigurationProvider.provideDebugConfigurations(folder, path.dirname(project));
            }
        }
        return [];
    }
}