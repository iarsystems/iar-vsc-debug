import * as Debugger from "./thrift/bindings/Debugger";

export namespace Utils {
    /**
     * Loads a list of macro files in order.
     */
    export async function loadMacros(dbg: Debugger.Client, macros: string[]) {
        for (const macro in macros) {
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