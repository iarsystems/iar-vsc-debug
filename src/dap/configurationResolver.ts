'use strict';

import { SessionConfiguration } from "./thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "./cspyDebug";


/**
 * Resolves a {@link CSpyLaunchRequestArguments} provided by the DAP client
 * into a {@link SessionConfiguration} that can be used to launch a C-SPY session.
 *
 * Note that this interface (and LaunchRequestArguments) are in an early stage,
 * and will likely need to change (especially LaunchRequestArguments).
 */
export interface ConfigurationResolver {
	/**
	 * Creates a valid {@link SessionConfiguration} from a {@link CSpyLaunchRequestArguments}.
	 * May reject if no resolution is possible.
	 */
	resolveLaunchArguments(launchArguments: CSpyLaunchRequestArguments): Promise<SessionConfiguration>;
}