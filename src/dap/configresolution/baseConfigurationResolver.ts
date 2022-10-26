/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { ConfigurationResolver } from "./configurationResolver";
import { SessionConfiguration } from "iar-vsc-common/thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "../cspyDebug";
import * as Path from "path";
import { StackSettings } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Fs from "fs";
import { IarOsUtils } from "iar-vsc-common/osUtils";
import { logger } from "@vscode/debugadapter/lib/logger";

/**
 * A session config containing only the values {@link BaseConfigurationResolver} is not able to provide.
 */
export interface PartialSessionConfiguration {
    attachToTarget: boolean,
    driverFile: string,
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
    private static readonly SUPPORTED_TARGETS = ["arm", "riscv", "rh850", "rl78", "avr"];

    async resolveLaunchArguments(launchArguments: CSpyLaunchRequestArguments): Promise<SessionConfiguration> {
        if (!Fs.existsSync(launchArguments.program)) {
            return Promise.reject(new Error(`The program '${launchArguments.program}' does not exist.`));
        }
        if (launchArguments.projectPath && !Fs.existsSync(launchArguments.projectPath)) {
            return Promise.reject(new Error(`The path '${launchArguments.projectPath}' does not exist.`));
        }
        if (!launchArguments.bypassTargetRestriction && !BaseConfigurationResolver.SUPPORTED_TARGETS.includes(launchArguments.target.toLowerCase())) {
            return Promise.reject(new Error(`Unsupported target '${launchArguments.target}'. Currently, only ${BaseConfigurationResolver.SUPPORTED_TARGETS.join(", ")} are supported.`));
        }

        const partialValues = await this.resolveLaunchArgumentsPartial(launchArguments);
        const libsupportPath = IarOsUtils.resolveTargetLibrary(launchArguments.workbenchPath, partialValues.target, "LibSupportEclipse");
        if (libsupportPath !== undefined) {
            partialValues.plugins.push(libsupportPath);
        } else {
            // Don't abort here: we can still launch the session, but e.g. terminal i/o won't work
            logger.error("LibSupportEclipse is missing from " + launchArguments.workbenchPath);
        }

        // Do the work on the project path which may be an ewp-file or a directory.
        let projectDir = launchArguments.projectPath;
        if (projectDir && Fs.lstatSync(projectDir).isFile()) {
            // The user has given a file, so get the path to the directory in
            // which the file is located.
            projectDir = Path.parse(projectDir).dir;
        }
        const projectName: string = launchArguments.projectPath ? Path.basename(launchArguments.projectPath) : Path.parse(launchArguments.program).name;

        // we don't support multicore yet
        partialValues.options = partialValues.options.filter(option => !option.match(/--multicore_nr_of_cores=\d+/));

        const config: SessionConfiguration = new SessionConfiguration({
            attachToTarget: partialValues.attachToTarget,
            driverName: partialValues.driverFile,
            processorName: partialValues.processorName,
            type: partialValues.type,
            executable: launchArguments.program,
            configName: launchArguments.projectConfiguration ?? "",
            leaveRunning: false,
            enableCRun: false,
            options: partialValues.options,
            plugins: partialValues.plugins,
            // VSC-298 Specify .vscode as project dir to avoid sharing settings folder with Embedded Workbench
            projectDir: Path.join(projectDir ?? Path.dirname(launchArguments.program), ".vscode"),
            projectName: projectName,
            setupMacros: partialValues.setupMacros,
            target: partialValues.target,
            toolkitDir: Path.join(launchArguments.workbenchPath, partialValues.target),
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