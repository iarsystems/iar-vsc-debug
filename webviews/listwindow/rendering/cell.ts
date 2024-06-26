/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Cell } from "../thrift/listwindow_types";
import { css } from "lit";
import { CLASS_GRID_ELEMENT } from "./sharedStyles";

/**
 * A single cell in a listwindow
 */
export class CellElement extends HTMLTableCellElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES = css`
        td {
            cursor: default;
        }
        td.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-top: 1px solid var(--vscode-focusBorder);
            border-bottom: 1px solid var(--vscode-focusBorder);
            border-right: none !important;
        }
    `;

    cell?: Cell = undefined;
    selected = false;
    showGrid = false;

    constructor() {
        super();
    }

    connectedCallback() {
        this.innerText = this.cell?.text ?? "";
        if (this.selected) {
            this.classList.add("selected");
        }
        if (this.showGrid) {
            this.classList.add(CLASS_GRID_ELEMENT);
        }
    }
}
customElements.define("listwindow-cell", CellElement, {
    extends: "td",
});