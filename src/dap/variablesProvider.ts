

import { Variable, Handles } from "vscode-debugadapter";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { ListWindowClient, ListWindowRow } from "./listWindowClient";
import { Disposable } from "./disposable";

/**
 * Provides a list of (expandable) variables.
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
}

/**
 * Converts a row from a C-SPY window to a DAP variable.
 * The variableReference field may be ignored, as it will be filled in by {@link ListWindowVariablesProvider}.
 */
type RowToVariableConverter = (row: ListWindowRow) => Variable;

/**
 * Provides DAP-format variables from a C-SPY window.
 */
export class ListWindowVariablesProvider implements VariablesProvider, Disposable {
    // The maximum amount of time to wait when expecting an update
    private static readonly UPDATE_TIMEOUT = 300;

    static async instantiate(serviceMgr: ThriftServiceManager,
        windowServiceId: string,
        rowToVariable: RowToVariableConverter): Promise<ListWindowVariablesProvider> {

        const windowClient = await ListWindowClient.instantiate(serviceMgr, windowServiceId);
        return new ListWindowVariablesProvider(windowClient, rowToVariable);
    }

    private readonly variableReferences: Handles<ListWindowRow> = new Handles();
    // While this is pending, do not request updates from the listwindow. It is about to update!
    private backendUpdate: Thenable<void>;

    private constructor(private readonly windowClient: ListWindowClient,
                        private readonly rowToVariable: RowToVariableConverter) {

        this.backendUpdate = Promise.resolve();
    }

    /**
     * Gets all top-level variables in this window
     */
    async getVariables(): Promise<Variable[]> {
        await this.backendUpdate;
        return this.windowClient.topLevelRows.map(row => this.createVariableFromRow(row));
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

    private createVariableFromRow(row: ListWindowRow) {
        const baseVar = this.rowToVariable(row);
        baseVar.variablesReference = row.hasChildren ? this.variableReferences.create(row) : 0;
        return baseVar;
    }
}