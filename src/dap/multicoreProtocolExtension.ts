/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CommandRegistry } from "./commandRegistry";
import { CustomRequest } from "./customRequest";

interface ExecutionRequestArguments {
    singleThread?: boolean;
}
interface ExecutionRequestResponse {
    body?: {
        allThreadsContinued?: boolean;
    };
}

/**
 * Provides a custom DAP request to enable or disable "lockstep mode" for a multicore session, i.e. whether the cores
 * all start/step/stop together when the user performs such an actions. This is already supported by DAP on a
 * per-request basis by setting the singleThread flag to true or false in the request (indicating whether the request
 * affects only a single thread or all of them). However, VS Code doesn't support this flag yet, so this is a
 * workaround. It only controls the behaviour of requsts that are missing the singleThread flag; any requests that
 * explicitly specify it still behave according to the specification.
 *
 * To use this class, any execution requests should pass their arguments and response through
 * {@link MulticoreProtocolExtension.massageExecutionRequest} before handling them, to let this class modify the request
 * as needed.
 */
export class MulticoreProtocolExtension {
    private multicoreLockstepModeEnabled = false;

    constructor(lockstepModeEnabled: boolean, requestRegistry: CommandRegistry<unknown, unknown>) {
        this.multicoreLockstepModeEnabled = lockstepModeEnabled;

        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.SET_LOCKSTEP_MODE_ENABLED, CustomRequest.isSetLockstepModeArgs,
            lockstepEnabled => this.multicoreLockstepModeEnabled = lockstepEnabled.enabled);
    }

    massageExecutionRequest(args: ExecutionRequestArguments, response: ExecutionRequestResponse) {
        if (args.singleThread === undefined) {
            args.singleThread = !this.multicoreLockstepModeEnabled;
        }
        if (response.body === undefined) response.body = {};
        response.body.allThreadsContinued = !args.singleThread;
    }
}