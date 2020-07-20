'use strict';

import { ConfigurationResolver } from "./configurationResolver";
import { SessionConfiguration } from "../thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "../cspyDebug";
import * as Path from "path";
import { StackSettings } from "../thrift/bindings/shared_types";
import * as Fs from "fs";

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
            return Promise.reject(`The program '${launchArguments.program}' does not exist.`);
        }
        if (!Fs.existsSync(launchArguments.projectPath)) {
            return Promise.reject(`The project '${launchArguments.projectPath}' does not exist.`);
        }
        if (!Fs.existsSync(launchArguments.workbenchPath)) {
            return Promise.reject(`The workbench folder '${launchArguments.workbenchPath}' does not exist.`);
        }

        const partialValues = await this.resolveLaunchArgumentsPartial(launchArguments);

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
            plugins: partialValues.plugins,
            projectDir: Path.parse(launchArguments.projectPath).dir,
            projectName: Path.basename(launchArguments.projectPath),
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