import { DebugProtocol } from "@vscode/debugprotocol";

export namespace VariablesUtils {

    /**
     * Creates a new DAP variable. This method standardises some of the derived properties (such as memoryReference and evaluateName).
     * @param name The variable name
     * @param value The variable value
     * @param type The type of the variable if available
     * @param variablesReference A reference that can be used to fetch the variable's children (or 0 if it has no children)
     * @param address The address of the variable if available
     * @returns A DAP variable
     */
    export function createVariable(name: string, value: string, type: string | undefined, variablesReference: number, address: string | undefined): DebugProtocol.Variable {
        let memoryReference;
        // The specs are not very clear, but it seems pointer values should be treated specially, and use their value
        // as memory reference rather then the address of the pointer variable. This is how MS's RTOS view expects things to be.
        if (type && isPointerType(type)) {
            memoryReference = getAddressFromValue(value);
        } else {
            memoryReference = address ? address : undefined;
        }
        // massage the type to make it eval'able:
        // * remove any 'const' or 'volatile'
        // * change arrays to pointers (e.g. int[6] to int*)
        const evalType = type?.
            replace(/\s+const\s+/g, " ").
            replace(/\s+volatile\s+/g, " ").
            replace(/\[\d+\]/g, "*");
        return {
            name: name,
            value: value,
            type: type + (address ? ` @ ${address}` : ""),
            variablesReference: variablesReference,
            memoryReference: memoryReference?.replace(/'/g, ""),
            // This only works for some types (e.g. not arrays)
            evaluateName: address && evalType ? `*(${evalType}*)(${address})` : undefined,
        };
    }

    function isPointerType(type: string) {
        // this is probably not universal, but should be good enough for the simple types c-spy displays
        return type.includes("*");
    }
    // Extracts the memory address from a pointer value
    function getAddressFromValue(value: string): string | undefined {
        const hexRegex = "(0x[a-fA-F0-9']+)";
        {
            const match = value.match(new RegExp(`^${hexRegex}$`));
            if (match && match[1]) {
                return match[1];
            }
        }
        {
            const match = value.match(new RegExp(`^${hexRegex}\\s\\(.*\\)$`));
            if (match && match[1]) {
                return match[1];
            }
        }
        {
            const match = value.match(new RegExp(`^.*\\s\\(${hexRegex}\\)$`));
            if (match && match[1]) {
                return match[1];
            }
        }
        return undefined;
    }
}