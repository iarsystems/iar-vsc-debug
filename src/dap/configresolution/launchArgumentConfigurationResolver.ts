

import { CSpyLaunchRequestArguments } from "../cspyDebug";
import { BaseConfigurationResolver, PartialSessionConfiguration } from "./baseConfigurationResolver";
import { IarOsUtils } from "../../utils/osUtils";
import { IarUtils } from "../../utils/iarUtils";
import * as Path from "path";
import * as Fs from "fs";

/**
 * Attempts to create a C-SPY configuration by looking at `.xcl`
 * files in the settings directory of a project, which contain the
 * C-SPY command line arguments last used by the EW.
 */
export class LaunchArgumentConfigurationResolver extends BaseConfigurationResolver {

    resolveLaunchArgumentsPartial(args: CSpyLaunchRequestArguments): Promise<PartialSessionConfiguration> {

        const targets = IarUtils.getTargetsFromEwPath(args.workbenchPath);
        let target = "";
        if (targets.length > 0) {
            // Just use the first one in the list for now.
            target = targets[0];
            console.log("Using target " + target);
        }


        // Resolve the target from the the provided path.
        const folders = Fs.readdirSync(args.workbenchPath);
        for (let i = 0; i < folders.length; i++) {
            const possibleTarget = Path.basename(folders[i]);
            if (possibleTarget !== "common") {
                target = possibleTarget;
                break;
            }
        }

        if (!args.driverLib) {
            return Promise.reject(new Error("No driver lib specified"));
        }

        const plugins = args.plugins? args.plugins : [];
        // always add bat library.
        // plugins.push(IarOsUtils.resolveTargetLibrary(args.workbenchPath,target,"Bat"));

        const macros = args.macros? args.macros : [];

        const driver = IarOsUtils.resolveTargetLibrary(args.workbenchPath, target, args.driverLib);
        const proc = IarOsUtils.resolveTargetLibrary(args.workbenchPath, target, "proc");

        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverName: driver,
            processorName: proc,
            type: "simulator",
            options: ["--plugin=" + IarOsUtils.resolveTargetLibrary(args.workbenchPath, target, "Bat"), "--backend"].concat(args.driverOptions? args.driverOptions : []),
            plugins: plugins,
            setupMacros: macros,
            target: target
        };

        return Promise.resolve(config);
    }
}