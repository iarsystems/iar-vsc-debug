'use strict';

import { SessionConfiguration } from "../thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "../cspyDebug";
import * as Path from "path";
import { StackSettings } from "../thrift/bindings/shared_types";
import { BaseConfigurationResolver, PartialSessionConfiguration } from "./baseConfigurationResolver";

/**
 * A mock resolver for testing/prototyping purposes.
 * Returns an arm simulator config.
 */
export class MockConfigurationResolver extends BaseConfigurationResolver {

	resolveLaunchArgumentsPartial(args: CSpyLaunchRequestArguments): Promise<PartialSessionConfiguration> {
        const config: PartialSessionConfiguration = {
            attachToTarget: false,
            driverName: "armsim2",
            processorName: "armproc",
            type: "simulator",
            options: [ "--backend", "-B", "--endian=little", "--cpu=Cortex-M3", "--fpu=None", "--semihosting", "--drv_verify_download" ],
            plugins: ["armbat"],
            setupMacros: [],
            target: "arm",
		};

		return Promise.resolve(config);
	}

}