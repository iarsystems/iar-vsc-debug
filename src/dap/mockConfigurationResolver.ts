'use strict';

import { ConfigurationResolver } from "./configurationResolver";
import { SessionConfiguration } from "./thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "./cspyDebug";
import * as Path from "path";
import { StackSettings } from "./thrift/bindings/shared_types";

/**
 * A mock resolver for testing/prototyping purposes.
 * Returns an arm simulator config.
 */
export class MockConfigurationResolver implements ConfigurationResolver {

	resolveLaunchArguments(args: CSpyLaunchRequestArguments): Promise<SessionConfiguration> {
        const config: SessionConfiguration = new SessionConfiguration({
            attachToTarget: false,
            driverName: "armsim2",
            processorName: "armproc",
            type: "simulator",
            executable: args.program,
            configName: "Debug",
            leaveRunning: true,
            enableCRun: false,
            options: args.options,
            plugins: ["armbat"],
            projectDir: Path.resolve(Path.join(Path.parse(args.program).dir, "../../")),
            projectName: "ewproj.ewp",
            setupMacros: [],
            target: "arm",
            toolkitDir: Path.join(args.workbenchPath, "arm"),
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

}