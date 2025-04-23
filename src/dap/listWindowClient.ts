/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Q from "q";
import { MenuItem, Note, Row, SelectionFlags, ToolbarNote, What } from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "iar-vsc-common/thrift/bindings/ListWindowFrontend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ThriftServiceHandler } from "iar-vsc-common/thrift/thriftUtils";
import { Int64 } from "thrift";
import { Disposable } from "./utils";
import { logger } from "@vscode/debugadapter/lib/logger";

export interface Cell {
    value: string,
    isEditable: boolean,
}

export interface ListWindowRowReference {
    cells: Cell[];
    hasChildren: boolean;
    parentIds: string[][];
}

/**
 * Poses as a frontend for a list window, managing all events and keeping track of all its rows.
 * The contents are represented to users of this class as a tree, consisting of some top-level rows {@link getTopLevelRows},
 * and their children {@link getChildrenOf}.
 * NOTE: This class requires that the window cannot have identical rows at the same level (e.g. identical top-level rows
 * or identical children of some row). This works e.g. for variable windows, but might not be true for other windows.
 * Getting around this limitation is *possible*, but way too complicated to be worth doing until we actually need it.
 * NOTE 2: This class **only** works with non-sliding list windows.
 */
export class ListWindowClient implements ThriftServiceHandler<ListWindowFrontend.Client>, Disposable.Disposable {
    // IMPLEMENTATION NOTE: We always expand all rows as far as possible when fetching window contents from the backend
    // (as opposed to only expanding them when needed). This removes a lot of complexity in keeping track of rows' positions,
    // but may be a little slow sometimes.

    /**
     * Starts a new ListWindowClient and connects it to the provided backend.
     * @param serviceRegistry The service manager to use to start the service and connect to the backend
     * @param serviceId The name of the backend service
     * @param idColumns The indices of a column or set of columns that uniquely distinguish a row from its siblings. If there is no such set of columns for a window, this class cannot be used for that window
     */
    static async instantiate(serviceRegistry: ThriftServiceRegistry, serviceId: string, idColumns: number | number[]): Promise<ListWindowClient> {
        const backend = await serviceRegistry.findService(serviceId, ListWindowBackend.Client);
        if (await backend.service.isSliding()) {
            throw new Error("ListWindowClient does not support sliding windows.");
        }
        if (typeof idColumns === "number") {
            idColumns = [idColumns];
        }
        if (idColumns.length === 0) {
            throw new Error("ListWindowClient requires at least one id column");
        }
        const windowClient = new ListWindowClient(backend, idColumns);
        const loc = await serviceRegistry.startService(serviceId + ".frontend", ListWindowFrontend, windowClient);
        await backend.service.connect(loc);
        await backend.service.show(true);
        return windowClient;
    }

    private rows: Row[] = [];
    // Only allow one update at a time to avoid race conditions. Any new updates must await the current one.
    private currentUpdate: Q.Promise<unknown> | undefined;
    private oneshotChangeHandlers: Array<() => void> = [];

    private constructor(
        private readonly backend: ThriftClient<ListWindowBackend.Client>,
        private readonly idColumns: number[]) {
        this.currentUpdate = Q.resolve([]);
    }

    /**
     * Gets all top level rows, i.e. rows that have no parent. These are valid only until the next window update.
     * If the window is in the process of updating, waits for it to finish and returns the updated contents.
     */
    async getTopLevelRows(): Promise<ListWindowRowReference[]> {
        const rows = await this.getRows();
        const topLevelRows = rows.filter(row => TreeInfoUtils.getDepth(row.treeinfo) === 0).
            filter(row => row.cells.length > 0);
        return topLevelRows.map(row => this.createRowReference(row, []));
    }

    /**
     * Gets the direct children of an expandable row.
     */
    async getChildrenOf(parent: ListWindowRowReference): Promise<ListWindowRowReference[]> {
        if (!parent.hasChildren) {
            throw new Error("Attempted to expand a row that is not expandable.");
        }
        const rowIndex = await this.getRowIndex(parent);
        if (rowIndex === undefined) {
            throw new Error("Cannot find row in the window matching: " + this.getIdForCells(parent.cells).join(","));
        }
        this.expandRow(rowIndex);
        let rows = await this.getRows();
        const row = rows[rowIndex];
        if (row === undefined) {
            throw new Error("Cannot find row in the window matching: " + this.getIdForCells(parent.cells).join(","));
        }

        // How deep in a structure of subvariables are we?
        const depth = TreeInfoUtils.getDepth(row.treeinfo);
        // Add rows at this indentation level until we reach the last child
        const children: Row[] = [];
        for (let i = rowIndex + 1; i < rows.length; i++) {
            let candidate = rows[i];
            if (!candidate || TreeInfoUtils.getDepth(candidate.treeinfo) !== depth + 1) {
                continue;
            }
            if (TreeInfoUtils.canToggleMore(candidate.treeinfo)) {
                this.toggleMore(i);
                rows = await this.getRows();
                candidate = rows[i];
                if (!candidate) {
                    continue;
                }
            }
            children.push(candidate);
            if (TreeInfoUtils.isLastChild(candidate.treeinfo)) {
                break;
            }
        }
        const parentIds = parent.parentIds.concat([this.getIdForCells(parent.cells)]);
        return children.map(row => this.createRowReference(row, parentIds));
    }

    /**
     * Sets the value of a cell
     * @param reference The row in which to set the value
     * @param column The column in this row to set the value for
     * @param value The value to set
     * @returns The new value of the call (may differ from the value set)
     */
    async setValueOf(reference: ListWindowRowReference, column: number, value: string) {
        const rowIndex = await this.getRowIndex(reference);
        if (rowIndex === undefined) {
            throw new Error("Cannot find row in the window matching: " + this.getIdForCells(reference.cells).join(","));
        }
        // Wait for any updates to finish so that when we wait again below, we know that any updates we see are
        // because of the setValue call, not some old update that hadn't finished.
        if (this.currentUpdate) await this.currentUpdate;
        await this.backend.service.setValue(new Int64(rowIndex), column, value);

        // Some windows (e.g. registers) don't update immediately after calling setValue, so we wait for it it push an update first
        await new Promise<void>(resolve => {
            this.onChangeOnce(() => {
                resolve();
            });
            setTimeout(() => resolve(), 500);
        });
        const updatedRow = await this.backend.service.getRow(new Int64(rowIndex));
        this.rows[rowIndex] = updatedRow;
        const updatedValue = updatedRow.cells[column];
        if (updatedValue === undefined) {
            throw new Error("No value in this column");
        }
        return updatedValue.text;
    }

    async selectCell(row: Int64, col: number): Promise<void> {
        return await this.backend.service.click(row, col, SelectionFlags.kReplace);
    }

    /**
     * Gets the context menu for clicking the given cell. Parsing the menu items is left to the caller.
     */
    async getContextMenu(row: Int64, col: number): Promise<MenuItem[]> {
        return await this.backend.service.getContextMenu(row, col);
    }
    /**
     * Clicks the context menu item corresponding to a command previously returned from {@link getContextMenu}.
     */
    async clickContextMenu(command: number) {
        await this.backend.service.handleContextMenu(command);
    }
    /**
     * Gets the context menu for clicking the given cell. Parsing the menu items is left to the caller.
     */
    async doubleClickRow(row: Int64, col: number): Promise<void> {
        return await this.backend.service.doubleClick(row, col);
    }

    /**
     * Registers a function to call next time the window contents change.
     */
    onChangeOnce(handler: () => void) {
        this.oneshotChangeHandlers.push(handler);
    }


    // callback from list window backend
    notify(note: Note): Q.Promise<void> {
        switch (note.what) {
            case What.kRowUpdate:
                return this.backend.service.getRow(note.row).then(row => {
                    this.rows[note.row.toNumber()] = row;
                });
            case What.kNormalUpdate:
            case What.kFullUpdate:
            case What.kThaw:
                this.updateAllRows();
                break;
        }
        return Q.resolve();
    }

    notifyToolbar(_: ToolbarNote): Q.Promise<void> {
        return Q.resolve();
    }

    async dispose(): Promise<void> {
        await this.backend.service.disconnect();
        this.backend.close();
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
            const nRows = (await this.backend.service.getNumberOfRows()).toNumber();
            const rows: Row[] = [];
            for (let i = 0; i < nRows; i++) {
                const row = await this.backend.service.getRow(new Int64(i));
                rows.push(row);
            }
            return rows;
        });
        updatePromise.then(rows => {
            this.rows = rows;
            if (this.currentUpdate === updatePromise) {
                this.currentUpdate = undefined;
                this.oneshotChangeHandlers.forEach(handler => handler());
                this.oneshotChangeHandlers = [];
            }
        }).catch(err => {
            logger.error("Error updating listwindow: " + err);
        });
        this.currentUpdate = updatePromise;
        return updatePromise;
    }

    // Expands a row and fetches the new rows following it
    private expandRow(rowIndex: number) {
        const previousUpdate = this.currentUpdate !== undefined ? this.currentUpdate : Q.resolve();
        const updatePromise = previousUpdate.then(async() => {
            const targetRow = this.rows[rowIndex];
            if (!targetRow || !TreeInfoUtils.isExpandable(targetRow.treeinfo) || TreeInfoUtils.isExpanded(targetRow.treeinfo)) {
                return;
            }
            await this.backend.service.toggleExpansion(new Int64(rowIndex));
            this.rows[rowIndex] = await this.backend.service.getRow(new Int64(rowIndex));

            const nRows = (await this.backend.service.getNumberOfRows()).toNumber();
            const nNewRows = nRows - this.rows.length;
            // Fetch and insert new rows
            const newRows = Array.from(Array(nNewRows).keys()).map(i => {
                return this.backend.service.getRow(new Int64(rowIndex + 1 + i));
            });
            this.rows.splice(rowIndex + 1, 0, ...(await Promise.all(newRows)));
        });
        updatePromise.then(() => {
            if (this.currentUpdate === updatePromise) {
                this.currentUpdate = undefined;
                this.oneshotChangeHandlers.forEach(handler => handler());
                this.oneshotChangeHandlers = [];
            }
        }).catch(err => {
            logger.error("Error updating listwindow: " + err);
        });
        this.currentUpdate = updatePromise;
    }

    // Presses the 'toggle more' button for a row (to reveal more siblings) and
    // fetches the new rows following it
    private toggleMore(rowIndex: number) {
        const previousUpdate = this.currentUpdate !== undefined ? this.currentUpdate : Q.resolve();
        const updatePromise = previousUpdate.then(async() => {
            const targetRow = this.rows[rowIndex];
            if (!targetRow || !TreeInfoUtils.canToggleMore(targetRow.treeinfo)) {
                return;
            }
            await this.backend.service.toggleMoreOrLess(new Int64(rowIndex));
            this.rows[rowIndex] = await this.backend.service.getRow(new Int64(rowIndex));

            const nRows = (await this.backend.service.getNumberOfRows()).toNumber();
            const nNewRows = nRows - this.rows.length;
            // Fetch and insert new rows
            const newRows = Array.from(Array(nNewRows).keys()).map(i => {
                return this.backend.service.getRow(new Int64(rowIndex + 1 + i));
            });
            this.rows.splice(rowIndex + 1, 0, ...(await Promise.all(newRows)));
        });
        updatePromise.then(() => {
            if (this.currentUpdate === updatePromise) {
                this.currentUpdate = undefined;
                this.oneshotChangeHandlers.forEach(handler => handler());
                this.oneshotChangeHandlers = [];
            }
        }).catch(err => {
            logger.error("Error updating listwindow: " + err);
        });
        this.currentUpdate = updatePromise;
    }

    // converts from internal (thrift) row class to the class used outwards
    private createRowReference(row: Row, parentIds: string[][]): ListWindowRowReference {
        return {
            cells: row.cells.map(cell => {
                return { value: cell.text, isEditable: cell.format.editable };
            }),
            hasChildren: TreeInfoUtils.isExpandable(row.treeinfo),
            parentIds: parentIds,
        };
    }

    public async getRowIndex(reference: ListWindowRowReference): Promise<number | undefined> {
        const rows = await this.getRows();
        const path = reference.parentIds.concat([this.getIdForCells(reference.cells)]);
        return this.getRowIndexRecursive(path, rows, 0);
    }
    private getRowIndexRecursive(ids: string[][], candidates: Row[], depth: number): number | undefined {
        const id = ids.shift();
        const found = candidates.findIndex(row =>
            JSON.stringify(this.getIdForRow(row)) === JSON.stringify(id) &&
            TreeInfoUtils.getDepth(row.treeinfo) === depth);
        if (found === -1) {
            return undefined;
        }
        if (ids.length === 0) {
            return found;
        }

        const newCandidates: Row[] = [];
        for (const candidate of candidates.slice(found + 1)) {
            if (TreeInfoUtils.getDepth(candidate.treeinfo) <= depth) {
                break;
            }
            newCandidates.push(candidate);
        }
        const subIndex = this.getRowIndexRecursive(ids, newCandidates, depth + 1);
        return subIndex !== undefined ? found + 1 + subIndex : undefined;
    }

    private getIdForCells(cells: Cell[]): string[] {
        return this.idColumns.map(idc => cells[idc]?.value).
            filter((value): value is string => value !== undefined);
    }
    private getIdForRow(row: Row): string[] {
        return this.idColumns.map(idc => row.cells[idc]?.text).
            filter((value): value is string => value !== undefined);
    }
}

// Utility functions for parsing treeinfo strings from listwindow rows
namespace TreeInfoUtils {
    // The tree info looks like <indentation><child info><expandability info>
    // where
    // <indentation> is a number of characters equal to the subvariable level - 1, so that the children of a top-level struct
    // have 0 characters padding, children of a struct within a top-level struct have one char of padding etc.
    // <child info> For non-top-level items, is a character indicating whether this is the last child of its parent ('L') or not ('T')
    // may also be 'v' if more siblings can be toggled, or '^' if more siblings have already been toggled.
    // <expandability info> '+' For not expanded, '-' for expanded, '.' for unexpandable (leaf)

    // States constituting a treeinfo, copied from IfxListModel.h
    enum TreeGraphItems {
        kLastChild  = "L",
        kLeaf       = ".",
        kPlus       = "+",
        kMinus      = "-",
        kMore       = "v",
        kLess       = "^",
    }

    /**
     * How many parents does this row have?
     */
    export function getDepth(treeinfo: string): number {
        if (treeinfo === "") {
            return 0;
        }
        return treeinfo.search(
            new RegExp(
                `[${TreeGraphItems.kLeaf}${TreeGraphItems.kPlus}\\${TreeGraphItems.kMinus}]`,
            ),
        );
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
    export function canToggleMore(treeinfo: string) {
        return treeinfo.includes(TreeGraphItems.kMore);
    }
}