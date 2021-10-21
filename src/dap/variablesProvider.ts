"use strict";

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
 * Provides variables from a C-SPY window.
 */
export class ListWindowVariablesProvider implements VariablesProvider, Disposable {
    static async instantiate(serviceMgr: ThriftServiceManager,
                             windowServiceId: string,
                             rowToVariable: RowToVariableConverter): Promise<ListWindowVariablesProvider> {
        const windowClient = await ListWindowClient.instantiate(serviceMgr, windowServiceId);
        return new ListWindowVariablesProvider(windowClient, rowToVariable);
    }

    private variableReferences: Handles<ListWindowRow> = new Handles();

    private constructor(private windowClient: ListWindowClient,
                        private rowToVariable: RowToVariableConverter) {}

    getVariables(): Promise<Variable[]> {
        return Promise.resolve(
            this.windowClient.topLevelRows.map(row => this.createVariableFromRow(row))
        );
    }

    async getSubvariables(variableReference: number) {
        const referencedRow = this.variableReferences.get(variableReference);
        const children = await this.windowClient.getChildrenOf(referencedRow);
        return children.map(row => this.createVariableFromRow(row));

    }

    async dispose() {
        await this.windowClient.dispose();
    }

    private createVariableFromRow(row: ListWindowRow) {
        const baseVar = this.rowToVariable(row);
        baseVar.variablesReference = row.expandable ? this.variableReferences.create(row) : 0;
        return baseVar;
    }
}