/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { SessionConfiguration } from "iar-vsc-common/thrift/bindings/cspy_types";
import { CSpyLaunchRequestArguments } from "../cspyDebug";


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
     * @param launchArguments The launch arguments to turn into a SessionConfiguration
     */
    resolveLaunchArguments(launchArguments: CSpyLaunchRequestArguments): Promise<SessionConfiguration>;
}