

import { CSpyLaunchRequestArguments } from "../cspyDebug";
import { BaseConfigurationResolver, PartialSessionConfiguration } from "./baseConfigurationResolver";
import { IarOsUtils } from "../../utils/osUtils";

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

        const plugins = args.plugins? args.plugins : [];
        const macros = args.macros? args.macros : [];

        const driver = IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, args.driver);
        if (driver === undefined) {
            throw new Error(`Could not find driver '${args.driver}' for '${args.workbenchPath}'.`);
        }
        const proc = IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, "proc");
        if (proc === undefined) {
            throw new Error(`Could not find library 'proc' for '${args.workbenchPath}'.`);
        }
        const batPlugin = IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, "Bat");
        if (batPlugin === undefined) {
            throw new Error(`Could not find plugin 'Bat' for '${args.workbenchPath}'.`);
        }

        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverName: driver,
            processorName: proc,
            type: "simulator",
            options: ["--plugin=" + batPlugin, "--backend"].concat(args.driverOptions? args.driverOptions : []),
            plugins: plugins,
            setupMacros: macros,
            target: args.target
        };

        return Promise.resolve(config);
    }
}