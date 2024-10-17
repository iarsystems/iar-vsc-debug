/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    Note,
    Row,
    SelRange,
    What,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import { RenderParameters } from "../../webviews/shared/protocol";
import { Int64 } from "thrift";
import { toBigInt, toInt64 } from "../utils";

export class SimpleProxyCache {
    public cache: Map<bigint, Row> = new Map<bigint, Row>();

    constructor(
        private readonly client: ListWindowBackend.Client
    ) {}

    public async getRow(rowNo: bigint): Promise<Row> {
        if (this.cache.has(rowNo)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.cache.get(rowNo)!;
        }

        const row = await this.client.getRow(toInt64(rowNo));
        this.cache.set(rowNo, row);
        return row;
    }

    public deleteRow(rowNo: Int64) {
        const r = toBigInt(rowNo);
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
    private readonly cache: SimpleProxyCache;
    private readonly renderParams: Omit<RenderParameters, "scrollInfo"> =
        ListWindowProxy.getDefaultRenderParameters();

    private readonly isSliding: Q.Promise<boolean>;

    constructor(private readonly client: ListWindowBackend.Client) {
        this.cache = new SimpleProxyCache(client);
        this.isSliding = client.isSliding();
    }

    // callback from list window backend
    async notify(note: Note): Promise<Note> {
        switch (note.what) {
            case What.kSelectionUpdate: {
                await this.updateSelection();
                break;
            }
            case What.kRowUpdate: {
                this.cache.deleteRow(note.row);
                await this.updateSelection();
                break;
            }
            case What.kNormalUpdate: {
                // Update the rows from scratch.
                this.cache.cache.clear();
                await this.updateSelection();
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

    invalidateAllRows() {
        this.cache.cache.clear();
    }

    async updateSelection(): Promise<void> {
        if (this.client) {
            if (await this.isSliding) {
                const sel = await this.client.getSel();
                if (sel.row === -1) {
                    this.renderParams.selection = [];
                } else {
                    this.renderParams.selection = [
                        new SelRange({
                            first: new Int64(sel.row),
                            last: new Int64(sel.row),
                        }),
                    ];
                }
            } else {
                this.renderParams.selection = await this.client.getSelection();
            }
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
        offset: bigint,
        noVisibleRows: number,
    ): Promise<Omit<RenderParameters, "scrollInfo">> {
        if (!this.client || this.renderParams.frozen) {
            // No updates when the model is frozen.
            return this.renderParams;
        }

        await this.updateSelection();
        this.renderParams.rows = [];

        for (let i = 0; i < noVisibleRows; i++) {
            const rowNo = toInt64(BigInt(i) + offset);
            this.renderParams.rows.push(
                await this.cache.getRow(toBigInt(rowNo)),
            );
        }

        this.renderParams.offset = { value: offset.toString() };
        return this.renderParams;
    }

    static getDefaultRenderParameters(): Omit<RenderParameters, "scrollInfo"> {
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
            offset: { value: "0" },
        };
    }
}
