

import * as Q from "q";
import { Note, Row, What } from "./thrift/bindings/listwindow_types";
import * as ListWindowBackend from "./thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "./thrift/bindings/ListWindowFrontend";
import { ThriftClient } from "./thrift/thriftClient";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { Int64 } from "thrift";
import { Disposable } from "./disposable";

export interface ListWindowRow {
    values: string[];
    hasChildren: boolean;
    id: number; // this is just a row index
}

/**
 * Poses as a frontend for a list window, managing all events and keeping track of all its rows.
 * The contents are represented to users of this class as a tree, consisting of some top-level rows {@link topLevelRows},
 * and their children {@link getChildrenOf}.
 * NOTE: This class **only** works with non-sliding list windows.
 */
export class ListWindowClient implements Disposable {
    // IMPLEMENTATION NOTE: We always expand all rows as far as possible when fetching window contents from the backend
    // (as opposed to only expanding them when needed). This removes a lot of complexity in keeping track of rows' positions,
    // but may be a little slow sometimes.

    /**
     * Starts a new ListWindowClient and connects it to the provided backend.
     * @param serviceMgr The service manager to use to start the service and connect to the backend
     * @param serviceId The name of the backend service
     */
    static async instantiate(serviceMgr: ThriftServiceManager, serviceId: string): Promise<ListWindowClient> {
        const backend = await serviceMgr.findService(serviceId, ListWindowBackend.Client);
        if (await backend.service.isSliding()) {
            throw new Error("ListWindowClient does not support sliding windows.");
        }
        const windowClient = new ListWindowClient(backend);
        const loc = await serviceMgr.startService(serviceId + ".frontend", ListWindowFrontend, windowClient);
        await backend.service.connect(loc);
        await backend.service.show(true);
        return windowClient;
    }

    private rows: Row[] = [];
    // Only allow one update at a time to avoid race conditions. Any new updates must await the current one.
    private currentUpdate: Q.Promise<Row[]> | undefined;
    private oneshotChangeHandlers: Array<() => void> = [];

    private constructor(private readonly backend: ThriftClient<ListWindowBackend.Client>) {
        this.currentUpdate = Q.resolve([]);
    }

    /**
     * Gets all top level rows, i.e. rows that have no parent. These are valid only until the next window update.
     * If the window is in the process of updating, waits for it to finish and returns the updated contents.
     */
    async getTopLevelRows(): Promise<ListWindowRow[]> {
        const rows = await this.getRows();
        /** Convert internal (thrift) rows to {@link ListWindowRow}s */
        const results: ListWindowRow[] = [];
        rows.forEach((row, index) => {
            if (TreeInfoUtils.getDepth(row.treeinfo) === 0) {
                results.push(this.createListWindowRow(index));
            }
        });
        return results;
    }

    /**
     * Gets the direct children of an expandable row.
     */
    async getChildrenOf(parent: ListWindowRow): Promise<ListWindowRow[]> {
        if (!parent.hasChildren) {
            throw new Error("Attempted to expand a row that is not expandable.");
        }
        const rowIndex = parent.id;
        const rows = await this.getRows();
        const row = rows[rowIndex];
        if (row === undefined) {
            throw new Error("Cannot find row in the window matching: " + parent.values[0]);
        }

        // How deep in a structure of subvariables are we?
        const depth = TreeInfoUtils.getDepth(row.treeinfo);
        // Add rows at this indentation level until we reach the last child
        const children: number[] = [];
        for (let i = rowIndex + 1; i < this.rows.length; i++) {
            const candidate = this.rows[i];
            if (!candidate || TreeInfoUtils.getDepth(candidate.treeinfo) !== depth + 1) {
                continue;
            }
            children.push(i);
            if (TreeInfoUtils.isLastChild(candidate.treeinfo)) {
                break;
            }
        }
        return children.map(row => this.createListWindowRow(row));
    }

    /**
     * Sets the value of a cell
     * @param row The row in which to set the v alue
     * @param column The column in this row to set the value for
     * @param value The value to set
     * @returns The new value of the call (may differ from the value set)
     */
    async setValueOf(row: ListWindowRow, column: number, value: string) {
        await this.backend.service.setValue(new Int64(row.id), column, value);
        const updatedRow = await this.backend.service.getRow(new Int64(row.id));
        this.rows[row.id] = updatedRow;
        const updatedValue = updatedRow.cells[column];
        if (updatedValue === undefined) {
            throw new Error("No value in this column");
        }
        return updatedValue.text;
        // TODO: use promise
    }

    /**
     * Registers a function to call next time the window contents change.
     */
    onChangeOnce(handler: () => void) {
        this.oneshotChangeHandlers.push(handler);
    }


    // callback from list window backend
    notify(note: Note): Q.Promise<void> {
        // TODO: should we handle thawing (and freezing)?
        switch (note.what) {
        case What.kRowUpdate:
            return this.backend.service.getRow(note.row).then(row => {
                this.rows[note.row.toNumber()] = row;
            });
        case What.kNormalUpdate:
        case What.kFullUpdate:
            this.updateAllRows();
            break;
        }
        return Q.resolve();
    }

    async dispose(): Promise<void> {
        await this.backend.service.disconnect();
        this.backend.dispose();
    }

    /**
     * Gets the current window contents. If the window is in the process of updating, waits for it to finish and returns
     * the updated contents.
     */
    private getRows(): Promise<Row[]> {
        if (this.currentUpdate === undefined) {
            return Promise.resolve(this.rows);
        } else {
            // We're in the process of updating, so wait for the rows to change before resolving
            return new Promise((resolve, _) => {
                this.onChangeOnce(() => {
                    resolve(this.rows);
                });
            });
        }
    }

    private updateAllRows() {
        // The update algorithm is not safe to run concurrently, so wait for the previous update before starting
        const previousUpdate = this.currentUpdate !== undefined ? this.currentUpdate : Q.resolve();
        const updatePromise = previousUpdate.then(async() => {
            let nRows = (await this.backend.service.getNumberOfRows()).toNumber();
            const rows: Row[] = [];
            for (let i = 0; i < nRows; i++) {
                const row = await this.backend.service.getRow(new Int64(i));
                // if expandable, expand it and reload it
                if (TreeInfoUtils.isExpandable(row.treeinfo) && !TreeInfoUtils.isExpanded(row.treeinfo)) {
                    await this.backend.service.toggleExpansion(new Int64(i));
                    nRows = (await this.backend.service.getNumberOfRows()).toNumber();
                    rows.push(await this.backend.service.getRow(new Int64(i)));
                } else {
                    rows.push(row);
                }
            }
            return rows;
        });
        updatePromise.then(rows => {
            // Commit the new rows only if no other update has been started after us
            if (this.currentUpdate === updatePromise) {
                this.rows = rows;
                this.currentUpdate = undefined;
                this.oneshotChangeHandlers.forEach(handler => handler());
                this.oneshotChangeHandlers = [];
            }
        }).catch(err => {
            console.error("Error updating listwindow:");
            console.error(err);
        });
        this.currentUpdate = updatePromise;
        return updatePromise;
    }

    // converts from internal (thrift) row class to the class used outwards
    private createListWindowRow(rowIndex: number) {
        const row = this.rows[rowIndex];
        if (row === undefined) throw new Error("Couldn't create row");
        return {
            values: row.cells.map(cell => cell.text),
            hasChildren: TreeInfoUtils.isExpandable(row.treeinfo),
            id: rowIndex,
        };
    }
}

// Utility functions for parsing treeinfo strings from listwindow rows
namespace TreeInfoUtils {
    // The tree info looks like <indentation><child info><expandability info>
    // where
    // <indentation> is a number of characters equal to the subvariable level - 1, so that the children of a top-level struct
    // have 0 characters padding, children of a struct within a top-level struct have one char of padding etc.
    // <child info> For non-top-level items, is a character indicating whether this is the last child of its parent ('L') or not ('T')
    // <expandability info> '+' For not expanded, '-' for expanded, '.' for unexpandable (leaf)

    // States constituting a treeinfo, copied from IfxListModel.h
    enum TreeGraphItems {
        kLastChild  = "L",
        kOtherChild = "T",
        kLeaf       = ".",
        kPlus       = "+",
        kMinus      = "-",
    }

    /**
     * How many parents does this row have?
     */
    export function getDepth(treeinfo: string): number {
        return treeinfo.search(new RegExp(`[${TreeGraphItems.kLeaf}${TreeGraphItems.kPlus}\\${TreeGraphItems.kMinus}]`));
    }

    export function isLastChild(treeinfo: string): boolean {
        return treeinfo.match(new RegExp(`${TreeGraphItems.kLastChild}.$`)) !== null;
    }

    export function isExpandable(treeinfo: string) {
        return treeinfo.endsWith(TreeGraphItems.kMinus) || treeinfo.endsWith(TreeGraphItems.kPlus);
    }
    export function isExpanded(treeinfo: string) {
        return treeinfo.endsWith(TreeGraphItems.kMinus);
    }
}