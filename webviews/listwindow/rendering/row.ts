/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Row } from "../thrift/listwindow_types";
import { CellElement } from "./cell";
import { Styles } from "./styles";
import { customElement } from "./utils";

/**
 * A non-header row in a listwindow
 */
@customElement("listwindow-row", { extends: "tr" })
export class RowElement extends HTMLTableRowElement {
    // These styles are injected into the grid element's shadow DOM, since this
    // element has no shadow DOM of its own
    static readonly STYLES: Styles.StyleRules = {
        "tbody tr:hover:not(.selected)": {
            "background-color": "var(--vscode-list-hoverBackground)",
        },
    };

    row?: Row = undefined;
    selected = false;

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
            cellElem.onclick = ev => {
                if (ev.detail === 1) {
                    console.log("Single click");
                } else if (ev.detail === 2) {
                    console.log("Double click");
                }
            };

            this.appendChild(cellElem);
        }

        if (this.selected) {
            this.classList.add("selected");
        }
    }
}
