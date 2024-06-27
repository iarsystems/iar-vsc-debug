/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Column } from "../thrift/listwindow_types";
import { css } from "lit";
import { CLASS_GRID_ELEMENT, alignmentToClass } from "./sharedStyles";
import { ResizeHandleElement } from "./resizeHandle";

/**
 * A header row in a listwindow. These cells determine the width of each column,
 * and can be resizeable.
 */
export class HeaderElement extends HTMLTableRowElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES = css`
        th {
            position: relative;
            cursor: default;
            box-sizing: border-box;
            font-size: 1.1em;
            padding-bottom: 4px;
            padding-top: 4px;
        }
        th div {
            min-width: 20px;
        }
        th div.clickable:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
    `;

    columns: Column[] = [];
    columnWidths: number[] = [];
    showGrid = false;
    clickable = false;

    private columnHeaders: HTMLTableCellElement[] = [];

    constructor() {
        super();
    }

    connectedCallback() {
        this.columnHeaders = [];

        for (const [i, column] of this.columns.entries()) {
            const th = document.createElement("th");
            this.columnHeaders.push(th);

            if (this.columnWidths[i] !== undefined) {
                th.style.width = `${this.columnWidths[i]}px`;
                th.style.minWidth = `${this.columnWidths[i]}px`;
            }
            if (this.showGrid) {
                th.classList.add(CLASS_GRID_ELEMENT);
            }
            this.appendChild(th);

            const div = document.createElement("div");
            div.innerText = column.title;

            div.classList.add(alignmentToClass(column.defaultFormat.align));
            if (this.clickable) {
                div.classList.add("clickable");
            }

            th.appendChild(div);

            if (!column.fixed) {
                const handle = new ResizeHandleElement();
                th.addEventListener("resize-handle-moved", ev => {
                    const prevWidth = this.columnWidths[i];
                    if (prevWidth === undefined) {
                        return;
                    }

                    const width = prevWidth + ev.detail.deltaX;
                    this.columnWidths[i] = width;
                    if (width >= 0) {
                        th.style.width = `${width}px`;
                        th.style.minWidth = `${width}px`;
                    }
                });
                th.addEventListener("resize-handle-dropped", () => {
                    // When we're finished resizing, we should check what the
                    // *actual* width became and store that as the starting
                    // point for future resizes
                    requestAnimationFrame(() => {
                        this.columnWidths = this.columnHeaders.map(
                            header => header.offsetWidth,
                        );
                        // TODO: store the widths for future sessions
                    });
                });
                th.appendChild(handle);
            }
        }

    }
}
customElements.define("listwindow-header", HeaderElement, {
    extends: "tr",
});