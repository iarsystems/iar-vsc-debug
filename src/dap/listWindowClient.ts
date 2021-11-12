

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

    // TODO: There needs to be some way of knowing that the data has been updated e.g. after the last kDkTargetStopped.
    // Right now the adapter is just assuming that all windows (variables etc.) update before the DAP client has time to request that data.
    // This is usually the case, but we shouldn't rely on it.
    private rows: Row[] = [];

    private constructor(private readonly backend: ThriftClient<ListWindowBackend.Client>) {
    }

    /**
     * Gets all top level rows, i.e. rows that have no parent, and should be displayed before any elements have been expanded.
     */
    get topLevelRows(): ListWindowRow[] {
        const topLevelRowsInternal = this.rows.filter(row => ["+", "-", "."].includes(row.treeinfo));
        return topLevelRowsInternal.map(ListWindowClient.createListWindowRow);
    }

    /**
     * Gets the children of an expandable row
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

        if (row.treeinfo !== "-") {
            await this.backend.service.toggleExpansion(new Int64(rowIndex));
            await this.updateAllRows();
        }
        const children: Row[] = [];
        const candidates = this.rows.slice(rowIndex + 1, this.rows.length);
        for (const candidateRow of candidates) {
            children.push(candidateRow);
            if (candidateRow.treeinfo.startsWith("L")) {
                break;
            }
        }
        return children.map(ListWindowClient.createListWindowRow);
    }

    // callback from list window backend
    notify(note: Note): Q.Promise<void> {
        console.log("LISTWINDOW NOTIFIED: ", note.what, note.anonPos.toString(), note.ensureVisible.toNumber(), note.row.toNumber(), note.seq.toNumber());
        switch (note.what) {
        case What.kRowUpdate:
            return this.backend.service.getRow(note.row).then(row => {
                this.rows[note.row.toNumber()] = row;
            });
            // TODO: is this an acceptable way to handle thawing (and freezing)?
        case What.kNormalUpdate:
        case What.kFullUpdate:
        case What.kThaw:
            return this.updateAllRows();
        }
        return Q.resolve();
    }

    async dispose(): Promise<void> {
        await this.backend.service.disconnect();
        this.backend.dispose();
    }

    private updateAllRows(): Q.Promise<void> {
        return this.backend.service.getNumberOfRows().then(async val => {
            const nRows = val.toNumber();
            const rowPromises: Q.Promise<Row>[] = [];
            for (let i = 0; i < nRows; i++) {
                rowPromises.push(this.backend.service.getRow(new Int64(i)));
            }
            const rows = await Q.all(rowPromises);
            this.rows = rows;
        });
    }

    // converts from internal (thrift) row class to the class used outwards
    private static createListWindowRow(row: Row) {
        return {
            values: row.cells.map(cell => cell.text),
            expandable: row.treeinfo === "+" || row.treeinfo === "-",
        };
    }
}