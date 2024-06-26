/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Column } from "../thrift/listwindow_types";
import { css } from "lit";
import { CLASS_GRID_ELEMENT, alignmentToClass } from "./sharedStyles";

/**
 * A header row in a listwindow. These cells determine the width of each column,
 * and can be resizeable.
 */
export class HeaderElement extends HTMLTableRowElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES = css`
        th {
            border-right-width: 3px !important;
            cursor: default
        }
        th div {
            min-width: 20px;
        }
        div.resizable {
            resize: horizontal;
        }
    `;

    columns: Column[] = [];
    showGrid = false;

    constructor() {
        super();
    }

    connectedCallback() {
        for (const column of this.columns) {
            const th = document.createElement("th");
            if (this.showGrid) {
                th.classList.add(CLASS_GRID_ELEMENT);
            }
            this.appendChild(th);

            const div = document.createElement("div");
            div.innerText = column.title;
            div.style.width = `${column.width}px`;

            div.classList.add(alignmentToClass(column.defaultFormat.align));
            if (!column.fixed) {
                div.classList.add("resizable");
            }

            th.appendChild(div);
        }
    }
}
customElements.define("listwindow-header", HeaderElement, {
    extends: "tr",
});