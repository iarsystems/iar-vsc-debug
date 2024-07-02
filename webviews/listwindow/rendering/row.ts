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
        "tbody tr": {
            "box-sizing": "border-box",
            "outline-offset": "-1px",
            "outline-width": "1px"
        },
        "tbody tr.selected": {
            "outline-style": "solid",
            "outline-color": "var(--vscode-contrastActiveBorder, var(--vscode-list-inactiveFocusOutline, rgba(0, 0, 0, 0)))",
        },
        [`.${Styles.CLASS_VIEW_FOCUSED} tbody tr.selected`]: {
            "outline-color": "var(--vscode-list-focusOutline)",
        },
        "tbody tr:hover:not(.selected)": {
            "background-color": "var(--vscode-list-hoverBackground)",
            "outline-style": "dotted",
            "outline-color": "var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))",
        },
    };

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
            cellElem.selected = this.selected;
            cellElem.position = { col: x, row: this.index };
            cellElem.hoverService = this.hoverService;

            this.appendChild(cellElem);
        }

        if (this.selected) {
            this.classList.add("selected");
        }
    }
}
