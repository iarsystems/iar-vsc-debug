/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Row } from "../thrift/listwindow_types";
import { CellElement } from "./cell/cell";
import { HoverService } from "./hoverService";
import { createCss } from "./styles/createCss";
import { customElement } from "./utils";

/**
 * A non-header row in a listwindow
 */
@customElement("listwindow-row")
export class RowElement extends HTMLElement {
    // These styles are injected into the grid element's shadow DOM, since this
    // element has no shadow DOM of its own
    static readonly STYLES = createCss({
        "listwindow-row": {
            display: "contents",
            "box-sizing": "border-box",
        },
    });

    row?: Row = undefined;
    index = -1;
    selected = false;

    hoverService: HoverService | undefined = undefined;

    constructor() {
        super();
    }

    connectedCallback() {
        if (!this.row) {
            // TODO: render an empty row?
            return;
        }
        for (const [x, cell] of this.row.cells.entries()) {
            const cellElem = new CellElement();
            cellElem.cell = cell;
            if (x === 0) {
                cellElem.treeinfo = this.row.treeinfo;
            }
            cellElem.selected = this.selected;
            cellElem.position = { col: x, row: this.index };
            cellElem.hoverService = this.hoverService;

            this.appendChild(cellElem);
        }
    }
}
