/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Row } from "../thrift/listwindow_types";
import { CellElement } from "./cell";
import { css } from "lit";

/**
 * A non-header row in a listwindow
 */
export class RowElement extends HTMLTableRowElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES = css`
        tbody tr:hover:not(.selected) {
            background-color: var(--vscode-list-hoverBackground);
        }
    `;

    row?: Row = undefined;
    selected = false;
    showGrid = false;

    constructor() {
        super();
    }

    connectedCallback() {
        if (!this.row) {
            // TODO: render an empty row?
            return;
        }
        for (const cell of this.row.cells) {
            const cellElem = new CellElement();
            cellElem.cell = cell;
            cellElem.selected = this.selected;
            cellElem.showGrid = this.showGrid;
            cellElem.onclick = (ev => {
                if (ev.detail === 1) {
                    console.log("Single click");
                } else if (ev.detail === 2) {
                    console.log("Double click");
                }
            });

            this.appendChild(cellElem);
        }

        if (this.selected) {
            this.classList.add("selected");
        }
    }
}
customElements.define("listwindow-row", RowElement, {
    extends: "tr",
});