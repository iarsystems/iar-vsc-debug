/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Cell, TextStyle } from "../thrift/listwindow_types";
import { css } from "lit";
import { CLASS_GRID_ELEMENT, alignmentToClass } from "./sharedStyles";

/**
 * A single cell in a listwindow
 */
export class CellElement extends HTMLTableCellElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES = css`
        td {
            cursor: default;
            white-space: nowrap;
            word-break: keep-all;
            max-width: 0; // always overflow rather than taking up space
        }
        td.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
            border-top: 1px solid var(--vscode-list-focusOutline);
            border-bottom: 1px solid var(--vscode-list-focusOutline);
            border-right: none !important;
        }
        td.editable {
            cursor: pointer;
        }

        .text-style-fixed {
            font-family: var(--vscode-editor-font-family)
        }
        .text-style-proportional {
            font-family: var(--vscode-font-family)
        }
        .text-style-bold {
            font-weight: bold;
        }
        .text-style-italic {
            font-style: italic;
        }
    `;

    cell?: Cell = undefined;
    selected = false;
    showGrid = false;

    constructor() {
        super();
    }

    connectedCallback() {
        if (!this.cell) {
            return;
        }

        this.innerText = this.cell.text;
        if (this.selected) {
            this.classList.add("selected");
        }
        if (this.showGrid) {
            this.classList.add(CLASS_GRID_ELEMENT);
        }

        // Add styles for the text format
        if (this.cell.format.editable) {
            this.classList.add("editable");
        }
        this.classList.add(alignmentToClass(this.cell.format.align));

        if (
            [
                TextStyle.kFixedPlain,
                TextStyle.kFixedBold,
                TextStyle.kFixedBoldItalic,
                TextStyle.kFixedItalic,
            ].includes(this.cell.format.style)
        ) {
            this.classList.add("text-style-fixed");
        } else {
            this.classList.add("text-style-proportional");
        }
        if (
            [
                TextStyle.kFixedBold,
                TextStyle.kFixedBoldItalic,
                TextStyle.kProportionalBold,
                TextStyle.kProportionalBoldItalic,
            ].includes(this.cell.format.style)
        ) {
            this.classList.add("text-style-bold");
        }
        if (
            [
                TextStyle.kFixedItalic,
                TextStyle.kFixedBoldItalic,
                TextStyle.kProportionalItalic,
                TextStyle.kProportionalBoldItalic,
            ].includes(this.cell.format.style)
        ) {
            this.classList.add("text-style-italic");
        }
    }
}
customElements.define("listwindow-cell", CellElement, {
    extends: "td",
});
