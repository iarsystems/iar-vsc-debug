

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
    expandable: boolean;
}

// States constituting a treeinfo, copied from IfxListModel.h
enum TreeGraphItems {
    kLastChild  = "L",
    kOtherChild = "T",
    kPlus       = "+",
    kMinus      = "-",
}

/**
 * Poses as a frontend for a list window, managing all events and keeping track of all its rows.
 * Also helps manage tree elements (i.e. expandable rows).
 * NOTE: This class currently only supports tree elements of depth 2. TODO: support infinite expansion
 * NOTE: This class **only** works with non-sliding list windows.
 */
export class ListWindowClient implements Disposable {

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
    private currentUpdate: Q.Promise<Row[]>;
    private oneshotChangeHandlers: Array<() => void> = [];

    private constructor(private readonly backend: ThriftClient<ListWindowBackend.Client>) {
        this.currentUpdate = Q.resolve([]);
    }

    /**
     * Gets all top level rows, i.e. rows that have no parent, and should be displayed before any elements have been expanded.
     */
    get topLevelRows(): ListWindowRow[] {
        const topLevelRowsInternal = this.rows.filter(row => ["+", "-", "."].includes(row.treeinfo));
        return topLevelRowsInternal.map(ListWindowClient.createListWindowRow);
    }

    /**
     * Gets the direct children of an expandable row
     */
    async getChildrenOf(parent: ListWindowRow): Promise<ListWindowRow[]> {
        if (!parent.expandable) {
            throw new Error("Attempted to expand a row that is not expandable.");
        }
        // Comparing the first column should be enough for most cases to identify a row.
        // A more robust way would be to keep track of indices, but that is hard since indices keep changing
        // when we expand rows. We could also let the row-comparison be defined e.g. as a predicate
        // passed as a parameter, so the comparison can be changed on a per-window basis.
        const rowIndex = this.rows.findIndex(r => r.cells[0]?.text === parent.values[0]);
        if (rowIndex === -1) {
            throw new Error("Cannot find row in the window matching: " + parent.values[0]);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const row = this.rows[rowIndex]!;

        if (!row.treeinfo.endsWith(TreeGraphItems.kMinus)) {
            await this.backend.service.toggleExpansion(new Int64(rowIndex));
            await this.updateAllRows();
        }
        const children: Row[] = [];
        const candidates = this.rows.slice(rowIndex + 1, this.rows.length);
        // The tree info looks like <indentation><child info><expandability info>
        // where
        // <indentation> is a number of characters equal to the subvariable level - 1, so that the children of a top-level struct
        // have 0 characters padding, children of a struct within a top-level struct have one char of padding etc.
        // <child info> For non-top-level items, is a character indicating whether this is the last child of its parent ('L') or not ('T')
        // <expandability info> '+' For not expanded, '-' for expanded, '.' for unexpandable (leaf)
        // How deep in a structure of subvariables are we?
        const indentationLevel = this.rows[rowIndex]?.treeinfo.indexOf(TreeGraphItems.kMinus);
        if (indentationLevel === undefined || indentationLevel === -1) {
            throw new Error("Couldn't find indentation level"); // Should not be able to happen
        }
        // Add rows at this indentation level until we reach the last child
        // Note that we ignore rows which do not match either kOtherChild or kLastChild,
        // since they have a different indentation level and should not be returned (only direct children should)
        for (const candidateRow of candidates) {
            const childInfo = candidateRow.treeinfo[indentationLevel];
            if (childInfo === TreeGraphItems.kOtherChild) {
                children.push(candidateRow);
            } else if (childInfo === TreeGraphItems.kLastChild) {
                children.push(candidateRow);
                break;
            }
        }
        return children.map(ListWindowClient.createListWindowRow);
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

    private updateAllRows() {
        const updatePromise = this.backend.service.getNumberOfRows().then(async(val) => {
            const nRows = val.toNumber();
            const rowPromises: Q.Promise<Row>[] = [];
            for (let i = 0; i < nRows; i++) {
                rowPromises.push(this.backend.service.getRow(new Int64(i)));
            }
            const rows = await Q.all(rowPromises);
            return rows;
        });
        updatePromise.then(rows => {
            // Commit the new rows only if no other update has been started after us
            if (this.currentUpdate === updatePromise) {
                this.rows = rows;
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
    private static createListWindowRow(row: Row) {
        return {
            values: row.cells.map(cell => cell.text),
            expandable: row.treeinfo.endsWith(TreeGraphItems.kPlus) || row.treeinfo.endsWith(TreeGraphItems.kMinus),
        };
    }
}
