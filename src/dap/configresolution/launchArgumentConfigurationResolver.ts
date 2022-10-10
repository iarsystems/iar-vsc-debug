/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { CSpyLaunchRequestArguments } from "../cspyDebug";
import { BaseConfigurationResolver, PartialSessionConfiguration } from "./baseConfigurationResolver";
import { IarOsUtils } from "iar-vsc-common/osUtils";
import { CSpyDriver } from "../breakpoints/cspyDriver";

/**
 * Attempts to create a C-SPY configuration by looking at `.xcl`
 * files in the settings directory of a project, which contain the
 * C-SPY command line arguments last used by the EW.
 */
export class LaunchArgumentConfigurationResolver extends BaseConfigurationResolver {

    resolveLaunchArgumentsPartial(args: CSpyLaunchRequestArguments): Promise<PartialSessionConfiguration> {
        if (!args.driver) {
            return Promise.reject(new Error("No driver lib specified"));
        }

        const plugins = args.plugins ?? [];
        // eslint-disable-next-line deprecation/deprecation
        const macros = args.setupMacros ?? args.macros ?? [];

        const driver = CSpyDriver.driverFromName(args.driver, args.target);
        const driverFile = driver.libraryBaseNames.
            map(baseName => IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, baseName)).
            find(driverFile => driverFile !== undefined);
        if (driverFile === undefined) {
            throw new Error(`Could not find driver file(s) '${driver.libraryBaseNames.join(",")}' for '${args.workbenchPath}'.`);
        }
        const proc = IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, "proc");
        if (proc === undefined) {
            throw new Error(`Could not find library 'proc' for '${args.workbenchPath}'.`);
        }

        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverFile,
            processorName: proc,
            type: "simulator",
            options: ["--backend"].concat(args.driverOptions? args.driverOptions : []),
            plugins: plugins,
            setupMacros: macros,
            target: args.target
        };

        return Promise.resolve(config);
    }
}
