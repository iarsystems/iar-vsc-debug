/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    Note,
    Row,
    What,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import { RenderParameters } from "../../webviews/listwindow/protocol";
import { Int64 } from "thrift";

export class SimpleProxyCache {
    private client: ListWindowBackend.Client | undefined = undefined;
    public cache: Map<bigint, Row> = new Map<bigint, Row>();

    public connect(c: ListWindowBackend.Client) {
        this.client = c;
        this.cache.clear();
    }

    public async getRow(rowNo: Int64): Promise<Row> {
        const bigIntNo = BigInt(rowNo.toString());
        if (this.cache.has(bigIntNo)) {
            return this.cache.get(bigIntNo) as Row;
        }

        const row = await this.client?.getRow(new Int64(Number(rowNo)));
        this.cache.set(bigIntNo, row as Row);
        return row as Row;
    }

    public DeleteRow(rowNo: Int64) {
        const r = BigInt(rowNo.toNumber());
        if (this.cache.has(r)) {
            return;
        }
        this.cache.delete(r);
    }
}

/** The proxy acts as a simple cache between the backend model and the frontend model
 *  to have the webview be more responsive. The proxy keeps track of the validity of
 *  the cache and supplies the view with RenderParameters 1: from the proxy or 2: from
 *  the backend in case the value is unknown.
 */
export class ListWindowProxy {
    // Start with a stupid cache.
    private readonly cache: SimpleProxyCache = new SimpleProxyCache();
    private client: ListWindowBackend.Client | undefined = undefined;
    private noRows = 0;
    private renderParams: RenderParameters =
        ListWindowProxy.getDefaultRenderParameters();

    // Swapping client.
    connectToClient(newClient: ListWindowBackend.Client) {
        this.client = newClient;
        this.cache.connect(newClient);
        this.renderParams = ListWindowProxy.getDefaultRenderParameters();
    }

    // callback from list window backend
    async notify(note: Note): Promise<Note> {
        switch (note.what) {
            case What.kSelectionUpdate: {
                await this.updateSelection();
                break;
            }
            case What.kRowUpdate: {
                this.cache.DeleteRow(note.row);
                await this.updateSelection();
                break;
            }
            case What.kNormalUpdate: {
                // Update the rows from scratch.
                this.cache.cache.clear();
                await this.updateSelection();
                await this.updateNumberOfRows();
                break;
            }
            case What.kFullUpdate: {
                // Update the rows, cols and listspec from scratch.
                this.cache.cache.clear();
                await this.updateColumns();
                await this.updateListSpec();
                await this.updateSelection();
                break;
            }
            case What.kFreeze: {
                this.renderParams.frozen = true;
                break;
            }
            case What.kThaw: {
                this.renderParams.frozen = false;
                break;
            }
            default:
        }
        return note;
    }

    getRenderParameter(): RenderParameters {
        return this.renderParams;
    }

    async updateSelection(): Promise<void> {
        if (this.client) {
            this.renderParams.selection = await this.client.getSelection();
        }
    }

    async updateNumberOfRows(): Promise<void> {
        if (this.client) {
            this.noRows = (await this.client.getNumberOfRows()).toNumber();
        }
    }

    async updateListSpec(): Promise<void> {
        if (this.client) {
            const spec = await this.client.getListSpec();
            if (spec.showHeader || spec.showGrid) {
                // Avoid resetting to default.
                this.renderParams.listSpec = spec;
            }
        }
    }

    async updateColumns(): Promise<void> {
        if (this.client) {
            const newCols = await this.client.getColumnInfo();
            if (newCols.length > 0) {
                this.renderParams.columnInfo = newCols;
            }
        }
    }

    async updateRenderParameters(
        offset: number,
        _noVisibleRows: number,
    ): Promise<RenderParameters> {
        if (!this.client || this.renderParams.frozen) {
            // No updates when the model is frozen.
            return this.renderParams;
        }

        this.renderParams.selection = await this.client.getSelection();
        this.renderParams.rows = [];

        for (let i = 0; i < this.noRows; i++) {
            const rowNo = new Int64(i + offset);
            this.renderParams.rows.push(await this.cache.getRow(rowNo));
        }

        return this.renderParams;
    }

    static getDefaultRenderParameters(): RenderParameters {
        const rows: Row[] = [];
        return {
            frozen: false,
            rows: rows,
            columnInfo: [],
            selection: [],
            listSpec: {
                bgColor: {
                    b: 0,
                    g: 0,
                    r: 0,
                    isDefault: true,
                    lowContrast: false,
                },
                canClickColumns: false,
                showCheckBoxes: false,
                showGrid: true,
                showHeader: true,
            },
        };
    }
}
