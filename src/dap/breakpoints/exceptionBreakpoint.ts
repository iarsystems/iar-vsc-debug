/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { DebugProtocol } from "@vscode/debugprotocol";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";

/**
 * Controls if/when to break on c++ exceptions
 */
export namespace ExceptionBreakpoints {
    // Exported for testing only
    export enum ExceptionFilters {
        BreakOnThrow = "breakOnThrow",
        BreakOnUncaughtException = "uncaughtException",
    }

    export function getExceptionFilters(): DebugProtocol.ExceptionBreakpointsFilter[] {
        return [
            {
                filter: ExceptionFilters.BreakOnThrow,
                label: "Break on Throw",
            },
            {
                filter: ExceptionFilters.BreakOnUncaughtException,
                label: "Break on Uncaught Exception",
            }
        ];
    }

    export async function setEnabledExceptionFilters(filters: string[], dbg: Debugger.Client) {
        if (!await dbg.supportsExceptions()) {
            return;
        }

        const doBreakOnThrow = filters.includes(ExceptionFilters.BreakOnThrow);
        await dbg.setBreakOnThrow(doBreakOnThrow);

        const doBreakOnUncaught = filters.includes(ExceptionFilters.BreakOnUncaughtException);
        await dbg.setBreakOnUncaughtException(doBreakOnUncaught);
    }
}