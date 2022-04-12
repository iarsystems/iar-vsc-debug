import * as vscode from "vscode";
import { logger } from "../utils/logger";
import { BuildExtensionChannel } from "./buildExtensionChannel";
import { BuildExtensionConfigurationProvider } from "./buildExtensionConfigurationProvider";
import { ConfigResolutionCommon } from "./common";
import { XclConfigurationProvider } from "./xclConfigurationProvider";

/**
 * For empty debug configurations, tries to provide a full debug configuration
 * based on the project selected in the build extension (if installed).
 */
export class CSpyConfigurationResolver implements vscode.DebugConfigurationProvider {
    // TODO: change this link to point to the documentation
    private static readonly HELP_LINK = "http://iar.com";

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
            const buildExtensionChannel = BuildExtensionChannel.getInstance();
            if (buildExtensionChannel === undefined) {
                vscode.window.showErrorMessage(`IAR: Unable to provide an automatic debug configuration: The IAR Build extension is not installed. For help, see [Debugging an Embedded Workbench project](${CSpyConfigurationResolver.HELP_LINK}).`);
                return;
            }
            const project = await buildExtensionChannel.getLoadedProject();
            const config = project !== undefined ? await buildExtensionChannel.getSelectedConfiguration(project) : undefined;
            if (project === undefined || config === undefined) {
                vscode.window.showErrorMessage("IAR: Unable to provide an automatic debug configuration: Please select a project and configuration in the IAR Build extension.");
                return;
            }

            // First try the more robust thrift-based provider. Use the xcl-based version as a fallback.
            try {
                const cmds = await buildExtensionChannel.getCSpyCommandline(project, config.name);
                if (!cmds) {
                    throw new Error("Could not get C-SPY cmdline");
                }
                logger.debug("Got C-SPY command line: " + cmds);
                const partialConfig = BuildExtensionConfigurationProvider.provideDebugConfigurationFor(cmds, project, config.name, config.target);
                return ConfigResolutionCommon.instantiateConfiguration(partialConfig, folder.uri.fsPath);
            } catch (e) {
                logger.debug("Failed to generate config from build extension: " + e);
            }
            try {
                const partialConfig = XclConfigurationProvider.provideDebugConfigurationFor(project, config.name);
                return ConfigResolutionCommon.instantiateConfiguration(partialConfig, folder.uri.fsPath);
            } catch (e) {
                logger.debug("Failed to generate config from .xcl files: " + e);
            }
            vscode.window.showErrorMessage(`IAR: Unable to provide an automatic debug configuration: Please launch the configuration in Embedded Workbench once and then try again. For help, see [Debugging an Embedded Workbench project](${CSpyConfigurationResolver.HELP_LINK}).`);
        }

        return debugConfiguration;
    }
}