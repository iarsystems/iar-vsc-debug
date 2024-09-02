/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Q from "q";
import {
    Note,
    Row,
    What,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { RenderParameters } from "../../webviews/listwindow/protocol";
import { Int64 } from "thrift";

export class ListwindowProxy {
    // Start with a stupid cache.
    private readonly cache: Map<number, Row>;

    private client: ListWindowBackend.Client | undefined = undefined;
    private renderParams: RenderParameters =
        ListwindowProxy.getDefaultRenderParameters();
    private readonly isFrozen = false;

    // Swapping client.
    connectToClient(newClient: ListWindowBackend.Client) {
        this.client = newClient;
        this.cache.clear();
        this.renderParams = ListwindowProxy.getDefaultRenderParameters();
    }

    constructor() {
        this.cache = new Map<number, Row>();
    }

    // callback from list window backend
    notify(note: Note): Q.Promise<void> {
        switch (note.what) {
            case What.kEnsureVisible:
            case What.kSelectionUpdate:
            case What.kRowUpdate: {
                break;
            }
            case What.kNormalUpdate:
            case What.kFullUpdate: {
                this.cache.clear();
                break;
            }
            case What.kFreeze:
            case What.kThaw:
            default:
        }
        return Q.resolve();
    }

    getRenderParameter(): RenderParameters {
        return this.renderParams;
    }

    /*
    private async updateListSpec(): Promise<void> {
        if (this.client) {
            this.renderParams.listSpec = await this.client.getListSpec();
        }
    }

    private async updateColumns(): Promise<void> {
        if (this.client) {
            this.renderParams.columnInfo = await this.client.getColumnInfo();
        }
    }
        */

    public async updateRenderParameters(
        offset: number, noVisibleRows: number
    ): Promise<RenderParameters> {
        if (!this.client || this.isFrozen) {
            return this.renderParams;
        }

        this.renderParams.selection = await this.client.getSelection();
        this.renderParams.rows = [];

        for (let i = 0; i < noVisibleRows; i++) {
            const rowNo = new Int64(i + offset);
            this.renderParams.rows.push(await this.client.getRow(rowNo));
        }


        return this.renderParams;
    }

    /**
     * Uses the given view to render to, and begins handling messages (e.g user
     * interaction) from it.
     */
    attachToView(_view: ListwindowViewProvider): void {
        /* */
    }

    /**
     * Forgets about any currently attached view.
     */
    detachFromView(): void {
        /* */
    }

    static getDefaultRenderParameters(): RenderParameters {
        const rows: Row[] = [];
        return {
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
