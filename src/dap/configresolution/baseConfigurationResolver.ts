

import { ConfigurationResolver } from "./configurationResolver";
import { SessionConfiguration } from "../thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "../cspyDebug";
import * as Path from "path";
import { StackSettings } from "../thrift/bindings/shared_types";
import * as Fs from "fs";
import { IarOsUtils } from "../../utils/osUtils";

/**
 * A session config containing only the values {@link BaseConfigurationResolver} is not able to provide.
 */
export interface PartialSessionConfiguration {
    attachToTarget: boolean,
    driverName: string,
    processorName: string,
    type: string,
    options: string[],
    plugins: string[],
    setupMacros: string[],
    target: string,
}

/**
 * Base class for all configuration resolvers.
 * Performs some validation of launch arguments (e.g. checks that the program exists),
 * and fills in trivial configuration values.
 */
export abstract class BaseConfigurationResolver implements ConfigurationResolver {
    // TODO: consider changing this so the implementer has a chance to modify also the 'trivial' values before the config is returned.

    async resolveLaunchArguments(launchArguments: CSpyLaunchRequestArguments): Promise<SessionConfiguration> {
        if (!Fs.existsSync(launchArguments.program)) {
            return Promise.reject(new Error(`The program '${launchArguments.program}' does not exist.`));
        }
        if (!Fs.existsSync(launchArguments.projectPath)) {
            return Promise.reject(new Error(`The path '${launchArguments.projectPath}' does not exist.`));
        }
        if (!Fs.existsSync(launchArguments.workbenchPath)) {
            return Promise.reject(new Error(`The workbench folder '${launchArguments.workbenchPath}' does not exist.`));
        }

        const partialValues = await this.resolveLaunchArgumentsPartial(launchArguments);
        const libsupportPath = IarOsUtils.resolveTargetLibrary(launchArguments.workbenchPath, partialValues.target, "LibSupportEclipse");

        // Do the work on the project path which may be an ewp-file or a directory.
        let projectPath: string = launchArguments.projectPath;
        const projectName: string = Path.basename(launchArguments.projectPath);
        if (Fs.lstatSync(projectPath).isFile()) {
            // The user has given a file, so get the path to the directory in
            // which the file is located.
            projectPath = Path.parse(projectPath).dir;
        }

        const config: SessionConfiguration = new SessionConfiguration({
            attachToTarget: partialValues.attachToTarget,
            driverName: partialValues.driverName,
            processorName: partialValues.processorName,
            type: partialValues.type,
            executable: launchArguments.program,
            configName: launchArguments.projectConfiguration,
            leaveRunning: false,
            enableCRun: false,
            options: partialValues.options,
            plugins: partialValues.plugins.concat([libsupportPath]),
            projectDir: projectPath,
            projectName: projectName,
            setupMacros: partialValues.setupMacros,
            target: partialValues.target,
            toolkitDir: Path.join(launchArguments.workbenchPath, partialValues.target), // TODO: this is probably not safe, find a better way to determine the path
            stackSettings: new StackSettings({
                fillEnabled: false,
                displayLimit: 50,
                limitDisplay: false,
                overflowWarningsEnabled: true,
                spWarningsEnabled: true,
                triggerName: "main",
                useTrigger: true,
                warnLogOnly: true,
                warningThreshold: 90,
            }),
        });

        return Promise.resolve(config);
    }

    /**
     * Provides the values that are non-trivial, and that the base class is not able to provide.
     */
    protected abstract resolveLaunchArgumentsPartial(launchArguments: CSpyLaunchRequestArguments): Promise<PartialSessionConfiguration>;

}