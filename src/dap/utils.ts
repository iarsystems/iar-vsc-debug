/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DebugProtocol } from "@vscode/debugprotocol";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { FileDialogFilter } from "iar-vsc-common/thrift/bindings/frontend_types";

export namespace Utils {
    /**
     * Loads a list of macro files in order.
     */
    export async function loadMacros(dbg: Debugger.Client, macros: string[]) {
        for (const macro of macros) {
            try {
                await dbg.loadMacroFile(macro);
            } catch (e) {
                if (e instanceof Error) {
                    throw new Error(`Failed to load macro '${macro}': ${e.message}`);
                }
                throw new Error(`Failed to load macro '${macro}'`);
            }
        }
    }

    /**
     * Convert a list of FileDialogFilters to windows style filters.
     * @param filters
     */
    export function createFilterString(filters: FileDialogFilter[]): string {
        let filterString = "";
        for (const filter of filters) {
            const extensions = filter.filtering.join(";");
            filterString += filter.displayName + " (" + extensions + ")|" + extensions + "|";
        }
        return filterString + "|";
    }
}

/**
 * Something through which we can send DAP events to the client
 */
export interface DapEventSink {
    sendEvent(event: DebugProtocol.Event): void;
}
