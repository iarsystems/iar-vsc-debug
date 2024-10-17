/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DebugProtocol } from "@vscode/debugprotocol";
import { BasicExprType, ExprValue } from "iar-vsc-common/thrift/bindings/cspy_types";

export namespace VariablesUtils {
    /**
     * Creates a new DAP variable. This method standardises some of the derived properties (such as memoryReference and evaluateName).
     * @param name The variable name
     * @param value The variable value
     * @param type The type of the variable if available
     * @param variablesReference A reference that can be used to fetch the variable's children (or 0 if it has no children)
     * @param address The address of the variable if available
     * @param isGloballyAvailable Whether the variable is a top-level variable in its inspection context, i.e. is not a
     *     child of e.g. a struct or pointer. This lets us use the variable's name as evaluateName, instead of a pointer expression.
     * @param readOnly Whether the user should be allowed to assign new values to the variable
     * @returns A DAP variable
     */
    export function createVariable(
        name: string,
        value: string,
        type: string | undefined,
        variablesReference: number,
        address: string | undefined,
        isGloballyAvailable: boolean,
        readOnly: boolean,
    ): DebugProtocol.Variable {
        let evaluateName: string | undefined;
        if (isGloballyAvailable) {
            // Some variables have display names that don't match the actual variable names (e.g. statics which have the module name at the end).
            // Make sure to use the actual variable name as evaluateName
            evaluateName = name.replace(/\s.*/, "");
        } else {
            // Generate a pointer expression for this variable, e.g. (MyType*)0xDEADBEEF
            // remove any 'const' or 'volatile'
            let evalType = type?.
                replace(/\s+const\s+/g, " ").
                replace(/\s+volatile\s+/g, " ");
            if (evalType?.match(/\[\d+\]/)) {
                evalType = evalType.replace(/\[\d+\]/g, "");
                evaluateName = address ? `(${evalType}*)(${address})` : undefined;
            } else {
                evaluateName = address && evalType ? `*(${evalType}*)(${address})` : undefined;
            }
        }
        return createVariableInternal(name, value, type, variablesReference, address, evaluateName, readOnly);
    }

    /**
     * Creates a new DAP variable. This method standardises some of the derived properties (such as memoryReference and evaluateName).
     * Since evaluted expressions have more type information, we can construct better (more robust) evaluateNames for them.
     * @param name The expression that was evaluated
     * @param value The value of the evaluated expression
     * @param variablesReference A reference that can be used to fetch the variable's children (or 0 if it has no children)
     * @param parents The parent expressions of this expression. Used to construct evalutateName
     * @returns A DAP variable
     */
    export function createVariableFromExpression(name: string, value: ExprValue, variablesReference: number, parents: Array<{exprName: string, val: ExprValue}>): DebugProtocol.Variable {
        const allElems = parents.concat({exprName: name, val: value});
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        let prevItem = allElems.shift()!;
        let evaluateName = prevItem.exprName;
        for (const item of allElems) {
            if (item.exprName === "") {
                continue; // ignore e.g. unnamed <struct> children of pointer expressions
            }
            let joinOperator: string;
            switch (prevItem.val.basicType) {
                case BasicExprType.Array:
                    joinOperator = "";
                    break;
                case BasicExprType.Pointer:
                    joinOperator = "->";
                    break;
                case BasicExprType.Unknown:
                case BasicExprType.Basic:
                case BasicExprType.Composite:
                case BasicExprType.Enumeration:
                case BasicExprType.Function:
                case BasicExprType.Custom:
                default:
                    joinOperator = ".";
                    break;
            }
            evaluateName = `(${evaluateName})${joinOperator}${item.exprName}`;
            prevItem = item;
        }
        const address = value.hasLocation ? "0x" + value.location.address.toOctetString() : undefined;
        return createVariableInternal(name, value.value, value.type, variablesReference, address, evaluateName);
    }

    function createVariableInternal(
        name: string,
        value: string,
        type: string | undefined,
        variablesReference: number,
        address: string | undefined,
        evaluateName: string | undefined,
        readOnly?: boolean,
    ): DebugProtocol.Variable {
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
        return {
            name: name,
            value: value,
            type: type + (address ? ` @ ${address}` : ""),
            variablesReference: variablesReference,
            memoryReference: memoryReference?.replace(/'/g, ""),
            // This only works for some types (e.g. not arrays)
            presentationHint: readOnly ? {
                attributes: ["readOnly"]
            } : {},
            evaluateName: evaluateName,
        };
    }

    function isPointerType(type: string) {
        // this is probably not universal, but should be good enough for the simple types c-spy displays
        return type.includes("*");
    }
    // Extracts the memory address from a pointer value
    function getAddressFromValue(value: string): string | undefined {
        // VSC-294 In some cases, a trailing space may be added to a numeric value
        value = value.trim();
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
        {
            const match = value.match(new RegExp(`^${hexRegex}\\s\\".*\\"$`));
            if (match && match[1]) {
                return match[1];
            }
        }
        return undefined;
    }
}