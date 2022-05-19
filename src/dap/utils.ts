/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";

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
}