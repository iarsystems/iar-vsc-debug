import * as vscode from "vscode";
import * as path from "path";
import { XclConfigurationProvider } from "./xclConfigurationProvider";
import { BuildExtensionChannel } from "./buildExtensionChannel";
import { BuildExtensionConfigurationProvider } from "./buildExtensionConfigurationProvider";
import { ConfigResolutionCommon } from "./common";
import { logger } from "iar-vsc-common/logger";

/**
 * Provides automatic debug configurations from a folder containing .ewp projects
 */
export class CSpyConfigurationsProvider implements vscode.DebugConfigurationProvider {
    // TODO: change this link to point to the documentation
    private static readonly HELP_LINK = "http://iar.com";

    async provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, _?: vscode.CancellationToken): Promise<vscode.DebugConfiguration[] | undefined> {
        if (folder !== undefined) {
            const buildExtensionChannel = BuildExtensionChannel.getInstance();
            if (buildExtensionChannel === undefined) {
                vscode.window.showErrorMessage(`IAR: Unable to provide automatic debug configurations: The IAR Build extension is not installed. For help, see [Debugging an Embedded Workbench project](${CSpyConfigurationsProvider.HELP_LINK}).`);
                return undefined;
            }

            const project = await buildExtensionChannel.getLoadedProject();
            if (project === undefined) {
                vscode.window.showErrorMessage("IAR: Unable to provide automatic debug configurations: Please select a project in the IAR Build extension.");
                return;
            }

            // First try the more robust thrift-based provider. Use the xcl-based version as a fallback.
            try {
                const configs = await buildExtensionChannel.getProjectConfigurations(project);
                if (configs) {
                    return await Promise.all(configs.map(async(conf) => {
                        const cmds = await buildExtensionChannel.getCSpyCommandline(project, conf.name);
                        if (!cmds) {
                            throw new Error("Could not get C-SPY cmdline");
                        }
                        logger.debug("Got C-SPY command line: " + cmds);
                        const partialConfig = BuildExtensionConfigurationProvider.provideDebugConfigurationFor(cmds, project, conf.name, conf.target);
                        return ConfigResolutionCommon.instantiateConfiguration(partialConfig, folder.uri.fsPath);
                    }));
                }
            } catch (e) {
                logger.debug("Failed to generate config from build extension: " + e);
            }
            try {
                const partialConfigs = XclConfigurationProvider.provideDebugConfigurations(folder, path.dirname(project));
                return partialConfigs.map(config => ConfigResolutionCommon.instantiateConfiguration(config, folder.uri.fsPath));
            } catch (e) {
                logger.debug("Failed to generate config from .xcl files: " + e);
            }
            vscode.window.showErrorMessage(`IAR: Unable to provide automatic debug configurations: Please debug the project in Embedded Workbench once and then try again. For help, see [Debugging an Embedded Workbench project](${CSpyConfigurationsProvider.HELP_LINK}).`);
        }
        return [];
    }
}