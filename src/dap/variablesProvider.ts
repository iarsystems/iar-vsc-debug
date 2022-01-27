

import { Variable, Handles } from "vscode-debugadapter";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { ListWindowClient, ListWindowRow } from "./listWindowClient";
import { Disposable } from "./disposable";
import { DebugProtocol } from "vscode-debugprotocol";

/**
 * Provides a list of (expandable) variables. Just like in DAP, expandable variables
 * will have a non-zero variableReference field, which can be used to access and refer to its subvariables.
 */
export interface VariablesProvider {
    /**
     * Gets all variables from this provider.
     */
    getVariables(): Promise<Variable[]>;
    /**
     * Gets all subvariables from a Variable previously returned by this provider.
     * @param variableReference The variableReference field of the {@link Variable} to get subvariables for
     */
    getSubvariables(variableReference: number): Promise<Variable[]>;
    /**
     * Sets a new value for a variable.
     * @param name The name of a variable previously returned by this provider
     * @param variableReference The variableReference of the parent variable, if any
     * @param value The value to set
     * @returns The new value of the variable, and the address of the changed variable if any. The value may be in a different format from the passed in value.
     */
    setVariable(name: string, variableReference: number | undefined, value: string): Promise<{newValue: string, changedAddress?: string}>;
}

/**
 * Provides DAP-format variables from a C-SPY window.
 */
export class ListWindowVariablesProvider implements VariablesProvider, Disposable {
    // The maximum amount of time to wait when expecting an update
    private static readonly UPDATE_TIMEOUT = 300;

    /**
     * Creates a new variables provider from a listwindow and a specification of which columns contain which data.
     * @param serviceMgr The service manager running the debug session
     * @param windowServiceId The name of the service running the listwindow to use
     * @param varNameColumn The column containing variable names
     * @param varValueColumn The column containing variable values
     * @param varTypeColumn The column containing variable type (may be negative if there is no such column)
     * @param varLocationColumn The column containing variable locations (may be negative if there is no such column)
     */
    static async instantiate(serviceMgr: ThriftServiceManager,
        windowServiceId: string,
        varNameColumn: number,
        varValueColumn: number,
        varTypeColumn: number,
        varLocationColumn: number): Promise<ListWindowVariablesProvider> {

        const windowClient = await ListWindowClient.instantiate(serviceMgr, windowServiceId);
        return new ListWindowVariablesProvider(windowClient, varNameColumn, varValueColumn, varTypeColumn, varLocationColumn);
    }

    private readonly variableReferences: Handles<ListWindowRow> = new Handles();
    // While this is pending, do not request updates from the listwindow. It is about to update!
    private backendUpdate: Thenable<void>;

    private constructor(private readonly windowClient: ListWindowClient,
        private readonly varNameColumn: number,
        private readonly varValueColumn: number,
        private readonly varTypeColumn: number,
        private readonly varLocationColumn: number) {

        this.backendUpdate = Promise.resolve();
    }

    /**
     * Gets all top-level variables in this window
     */
    async getVariables(): Promise<Variable[]> {
        await this.backendUpdate;
        const topLevelRows = await this.windowClient.getTopLevelRows();
        return topLevelRows.map(row => this.createVariableFromRow(row));
    }

    /**
     * Gets all sub-variables from expanding a variable in this window
     */
    async getSubvariables(variableReference: number) {
        await this.backendUpdate;
        const referencedRow = this.variableReferences.get(variableReference);
        const children = await this.windowClient.getChildrenOf(referencedRow);
        return children.map(row => this.createVariableFromRow(row));

    }

    async setVariable(name: string, variableReference: number | undefined, value: string): Promise<{newValue: string, changedAddress?: string}> {
        await this.backendUpdate;
        let rows: ListWindowRow[];
        if (!variableReference) {
            rows = await this.windowClient.getTopLevelRows();
        } else {
            const parentRow = this.variableReferences.get(variableReference);
            rows = await this.windowClient.getChildrenOf(parentRow);
        }
        const row = rows.find(row => row.values[this.varNameColumn] === name);
        if (!row) {
            throw new Error("Failed to find variable with name: " + name);
        }
        this.notifyUpdateImminent();
        const newVal = await this.windowClient.setValueOf(row, this.varValueColumn, value);

        const location = row.values[this.varLocationColumn];
        return { newValue: newVal, changedAddress: location ? this.locationToMemoryReference(location) : undefined };
    }

    /**
     * Notifies this provider that the backend is about to update its variables.
     * Calls made to {@link getVariables} or {@link getSubvariables} shortly after will wait for
     * the update to be received before returning.
     */
    notifyUpdateImminent() {
        this.backendUpdate = new Promise(resolve => {
            this.windowClient.onChangeOnce(() => {
                resolve();
            });
            setTimeout(() => resolve(), ListWindowVariablesProvider.UPDATE_TIMEOUT);
        });
    }

    async dispose() {
        await this.windowClient.dispose();
    }

    private createVariableFromRow(row: ListWindowRow): DebugProtocol.Variable {
        const name = row.values[this.varNameColumn];
        const value = row.values[this.varValueColumn];
        if (name === undefined || value === undefined) {
            throw new Error("Not enough data in row to parse variable");
        }
        const location = row.values[this.varLocationColumn];
        return {
            name: name,
            value: value,
            type: row.values[this.varTypeColumn] + (row.values[this.varLocationColumn] ? ` @ ${row.values[this.varLocationColumn]}` : ""),
            memoryReference: location ? this.locationToMemoryReference(location) : undefined,
            variablesReference: row.hasChildren ? this.variableReferences.create(row) : 0,
        };
    }

    // converts the contents of a list window cell to a dap memory reference, if possible
    private locationToMemoryReference(cellText: string): string | undefined {
        // should only return if it's a memory address (and not e.g. a register)
        if (cellText.match(/0x[a-fA-F0-9']/)) {
            // remove ' from number, makes for easier parsing
            return cellText.replace("'", "");
        }
        return undefined;
    }
}