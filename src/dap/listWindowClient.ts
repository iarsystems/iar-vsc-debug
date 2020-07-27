'use strict';

import * as Q from "q";
import { Note, Row, What } from "./thrift/bindings/listwindow_types";
import * as ListWindowBackend from "./thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "./thrift/bindings/ListWindowFrontend";
import { ThriftClient } from "./thrift/thriftclient";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import { Int64 } from "thrift";
import { Disposable } from "./disposable";

/**
 * Poses as a frontend for a list window, managing all events and keeping track of all its rows,
 * NOTE: This class **only** works with non-sliding list windows.
 */
export class ListWindowClient implements Disposable {
    // TODO: add some isUpdating flag or a rowsPromise so clients don't read old data
    private _rows: Row[] = [];

    constructor(private backend: ThriftClient<ListWindowBackend.Client>, private serviceId: string) {
    }

    async initialize(serviceMgr: ThriftServiceManager) {
        if (await this.backend.service.isSliding()) {
            throw new Error("ListWindowClient does not support sliding windows.");
        }
        const loc = await serviceMgr.startService(this.serviceId + ".frontend", ListWindowFrontend, this);
        this.backend.service.connect(loc);
    }

    get rows(): Row[] {
        return this._rows;
    }

    notify(note: Note): Q.Promise<void> {
        console.log("LISTWINDOW NOTIFIED: ", note.what, note.anonPos.toString(), note.ensureVisible.toNumber(), note.row.toNumber(), note.seq.toNumber());
        switch(note.what) {
            case What.kRowUpdate:
                return this.backend.service.getRow(note.row).then(row => {
                    this.rows[note.row.toNumber()] = row;
                });
            case What.kNormalUpdate:
            case What.kFullUpdate:
                return this.backend.service.getNumberOfRows().then(async val => {
                    const nRows = val.toNumber();
                    const rowPromises: Q.Promise<Row>[] = [];
                    for (let i = 0; i < nRows; i++) {
                        rowPromises.push(this.backend.service.getRow(new Int64(i)));
                    }
                    const rows = await Q.all(rowPromises);
                    this._rows = rows;
                });
        }
        return Q.resolve();
    }

    async dispose(): Promise<void> {
        await this.backend.service.disconnect();
        this.backend.dispose();
    }
}