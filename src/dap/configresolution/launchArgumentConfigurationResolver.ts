'use strict';

import { CSpyLaunchRequestArguments } from "../cspyDebug";
import { BaseConfigurationResolver, PartialSessionConfiguration } from "./baseConfigurationResolver";
import { CspyOsUtils} from "../cspyUtils";
import * as Path from "path";
import * as Fs from "fs";

/**
 * Attempts to create a C-SPY configuration by looking at `.xcl`
 * files in the settings directory of a project, which contain the
 * C-SPY command line arguments last used by the EW.
 */
export class LaunchArgumentConfigurationResolver extends BaseConfigurationResolver {

    resolveLaunchArgumentsPartial(args: CSpyLaunchRequestArguments): Promise<PartialSessionConfiguration> {

		// Resolve the target from the the provided path.
		var folders = Fs.readdirSync(args.workbenchPath);
		var target:string = "";
		for(var i = 0; i < folders.length; i++){
			var possibleTarget = Path.basename(folders[i]);
			if(possibleTarget !== "common"){
				target = possibleTarget;
				break;
			}
		}

		if(!args.driverLib){
			return Promise.reject("No driver lib specified");
		}

		const plugins = args.plugins? args.plugins : [];
		// always add bat library.
		plugins.push(CspyOsUtils.resolveTargetLibrary(args.workbenchPath,target,"Bat"));

		const macros = args.macros? args.macros : [];

        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverName: CspyOsUtils.resolveTargetLibrary(args.workbenchPath,target,args.driverLib),
            processorName: CspyOsUtils.resolveTargetLibrary(args.workbenchPath,target,"PROC"),
            type: "simulator",
            options: ["--plugin=" + CspyOsUtils.resolveTargetLibrary(args.workbenchPath,target,"Bat"),"--backend"].concat(args.driverOptions? args.driverOptions : []),
            plugins: plugins,
            setupMacros: macros,
            target: target
        };

        return Promise.resolve(config);
    }
}