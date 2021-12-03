

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
        const proc = IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, "proc");

        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverName: driver,
            processorName: proc,
            type: "simulator",
            options: ["--plugin=" + IarOsUtils.resolveTargetLibrary(args.workbenchPath, args.target, "Bat"), "--backend"].concat(args.driverOptions? args.driverOptions : []),
            plugins: plugins,
            setupMacros: macros,
            target: args.target
        };

        return Promise.resolve(config);
    }
}