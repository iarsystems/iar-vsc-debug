import * as vscode from "vscode";
import { BuildExtensionInteraction } from "./buildExtensionInteraction";
import { XclConfigurationProvider } from "./xclConfigurationProvider";

/**
 * A function that alters a debug configuration in some way before it is launched.
 */
export type DebugConfigurationModifier = (config: vscode.DebugConfiguration) => Promise<void>;

/**
 * Modifies cspy debug (launch.json) configurations before they are launched.
 */
export class CSpyConfigurationResolver implements vscode.DebugConfigurationProvider {
    private static instance: CSpyConfigurationResolver | undefined = undefined;

    public static getInstance(): CSpyConfigurationResolver {
        if (this.instance === undefined) {
            this.instance = new CSpyConfigurationResolver();
        }
        return this.instance;
    }

    private readonly modifiers: DebugConfigurationModifier[] = [];

    private constructor() {
        // empty
    }

    addModifier(modifier: DebugConfigurationModifier) {
        this.modifiers.push(modifier);
    }

    resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        debugConfiguration: vscode.DebugConfiguration,
        __?: vscode.CancellationToken
    ): vscode.DebugConfiguration | undefined {
        // Handle empty or non-existant launches
        if (!debugConfiguration.type && !debugConfiguration.request && !debugConfiguration.name) {
            if (folder === undefined) {
                throw new Error("Can not start a debug session without an open folder.");
            }
            const project = BuildExtensionInteraction.getSelectedProject(folder);
            const config = BuildExtensionInteraction.getSelectedConfiguration(folder);
            if (project === undefined || config === undefined) {
                throw new Error("Could not find a project and configuration to launch.");
            }
            debugConfiguration = XclConfigurationProvider.provideDebugConfigurationFor(folder, project, config);
        }
        return debugConfiguration;

    }

    async resolveDebugConfigurationWithSubstitutedVariables(
        __: vscode.WorkspaceFolder | undefined,
        debugConfiguration: vscode.DebugConfiguration,
        _?: vscode.CancellationToken
    ): Promise<vscode.DebugConfiguration | undefined> {

        for (const modifier of this.modifiers) {
            await modifier(debugConfiguration);
        }
        return debugConfiguration;
    }
}