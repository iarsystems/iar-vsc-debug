import * as vscode from "vscode";
import { BuildExtensionApi, ProjectConfiguration } from "../utils/buildExtension";

/**
 * A communication channel to the build extension. All interaction with the build extension should go through
 * this class, so we can test the interactions thoroughly.
 */
export class BuildExtensionChannel implements BuildExtensionApi {
    private static instance: BuildExtensionChannel | undefined;

    public static getInstance(): BuildExtensionChannel | undefined {
        if (!this.instance) {
            const buildExtension = vscode.extensions.getExtension("iarsystems.iar-build");
            if (!buildExtension || !buildExtension.isActive) {
                return undefined;
            }
            this.initialize(buildExtension.exports);
        }
        return this.instance;
    }

    // This is public so we can use a mock api for testing
    public static initialize(api: BuildExtensionApi) {
        this.instance = new BuildExtensionChannel(api);
    }

    private constructor(private readonly api: BuildExtensionApi) { }

    /**
     * Returns the currently selected workbench.
     */
    getSelectedWorkbench(): Promise<string | undefined> {
        return this.api.getSelectedWorkbench();
    }
    /**
     * Returns the currently loaded project (as an ewp file).
     */
    getLoadedProject(): Promise<string | undefined> {
        return this.api.getLoadedProject();
    }
    /**
     * Gets the name of the selected configuration for the project.
     * If the project is not already loaded, returns undefined.
     */
    getSelectedConfiguration(project: string): Promise<ProjectConfiguration | undefined> {
        return this.api.getSelectedConfiguration(project);
    }

    /**
     * Gets all configurations of the project.
     * If the project is not already loaded, returns undefined.
     */
    getProjectConfigurations(project: string): Promise<ProjectConfiguration[] | undefined> {
        return this.api.getProjectConfigurations(project);
    }

    /**
     * Returns the cspy arguments to use to launch a debug session.
     */
    getCSpyCommandline(projectPath: string, configuration: string): Promise<string[] | undefined> {
        return this.api.getCSpyCommandline(projectPath, configuration);
    }

}