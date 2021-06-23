'use strict';

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

		var targets = IarUtils.getTargetsFromEwPath(args.workbenchPath);
		var target:string = "";
		if(targets.length > 0){
			// Just use the first one in the list for now.
			target = targets[0];
			console.log("Using target " + target);
		}


		// Resolve the target from the the provided path.
		var folders = Fs.readdirSync(args.workbenchPath);
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
		plugins.push(IarOsUtils.resolveTargetLibrary(args.workbenchPath,target,"Bat"));

		const macros = args.macros? args.macros : [];

        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverName: IarOsUtils.resolveTargetLibrary(args.workbenchPath,target,args.driverLib),
            processorName: IarOsUtils.resolveTargetLibrary(args.workbenchPath,target,"PROC"),
            type: "simulator",
            options: ["--plugin=" + IarOsUtils.resolveTargetLibrary(args.workbenchPath,target,"Bat"),"--backend"].concat(args.driverOptions? args.driverOptions : []),
            plugins: plugins,
            setupMacros: macros,
            target: target
        };

        return Promise.resolve(config);
    }
}