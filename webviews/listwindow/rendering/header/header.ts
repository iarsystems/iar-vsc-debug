/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../../events";
import { ColumnResizeMode } from "../../protocol";
import { ResizeHandleElement } from "./resizeHandle";
import { createCss } from "../styles/createCss";
import { customElement } from "../utils";
import { Column } from "../../thrift/listwindow_types";
import { SharedStyles } from "../styles/sharedStyles";

/**
 * Emitted when the the user has resized a column
 */
export type ColumnsResizedEvent = CustomEvent<ColumnsResizedEvent.Detail>;
export namespace ColumnsResizedEvent {
    export interface Detail {
        /** The new column widths in pixels. */
        newColumnWidths: number[];
    }
}

/**
 * A header row in a listwindow. Handles resizing of columns.
 */
@customElement("listwindow-header")
export class HeaderElement extends HTMLElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES = createCss({
        "listwindow-header": {
            display: "contents",
            padding: "2px 0px",
            // Make header cells a bit bigger than normal ones
            "line-height": "27px",
            "font-weight": "normal",
            "text-transform": "uppercase",
            "font-size": "11px",
        },
        "listwindow-header>.clickable:hover": {
            "background-color": "var(--vscode-list-hoverBackground)",
            cursor: "pointer"
        },
        "listwindow-header>*": {
            position: "sticky",
            top: 0,
            "z-index": 20,
            width: "100%",
            overflow: "hidden",
            background: "var(--vscode-sideBar-background)",
            "box-sizing": "border-box",
        },
        ".header-title": {
            overflow: "hidden",
            "text-overflow": "ellipsis",
            padding: "0px 12px",
        }
    });

    private static readonly MIN_COL_WIDTH = 25;

    columns: Array<Column> = [];
    columnWidths: number[] = [];
    clickable = false;
    resizeMode: ColumnResizeMode = "fixed";

    private columnHeaders: HTMLElement[] = [];

    connectedCallback() {
        this.columnHeaders = [];

        for (const [i, column] of this.columns.entries()) {
            const colHeader = document.createElement("span");
            this.columnHeaders.push(colHeader);
            colHeader.classList.add(SharedStyles.CLASS_GRID_ITEM);
            if (this.clickable) {
                colHeader.classList.add("clickable");
            }
            this.appendChild(colHeader);

            const text = document.createElement("span");
            text.classList.add("header-title");
            text.innerText = column.title;
            colHeader.appendChild(text);

            colHeader.classList.add(
                SharedStyles.alignmentToClass(column.defaultFormat.align),
            );


            let addHandle = true;
            if (this.resizeMode === "fit" && this.getResizeTarget(i) === undefined) {
                // In 'fit' mode it doesn't make sense to have a resize handle
                // at the rightmost non-fixed-width column
                addHandle = false;
            }
            if (column.fixed) {
                addHandle = false;
            }

            if (addHandle) {
                const handle = new ResizeHandleElement();
                colHeader.addEventListener("resize-handle-drag-begin", () => {
                    this.beginResizeColumn(i);
                });
                colHeader.addEventListener("resize-handle-drag-end", () => {
                    // When we're finished resizing, we should check what the
                    // *actual* width became and store that for when we
                    // re-render
                    requestAnimationFrame(() => {
                        const widths = this.columnHeaders.map(th => th.offsetWidth);
                        this.dispatchEvent(createCustomEvent("columns-resized", {
                            detail: { newColumnWidths: widths },
                            bubbles: true,
                            composed: true,
                        }));
                    });
                });
                colHeader.appendChild(handle);
            }
        }

        this.applyColumnWidths(this.columnWidths);

        if (this.resizeMode === "fit") {
            this.applyRenderedWidthsAsFractions();
        }
    }

    // Set the width of each column to exactly match 'widthsInPixels'
    private applyColumnWidths(widthsInPixels: number[]) {
        let columnWidths = "";
        for (const width of widthsInPixels) {
            columnWidths += width + "px ";
        }
        if (this.parentElement) {
            this.parentElement.style.gridTemplateColumns = columnWidths;
        }
    }

    // Changes the width of each (non-fixed-width) to be specified as a
    // "fraction" based on its current rendered width. This makes the columns
    // scale proportionally to their fraction value.
    private applyRenderedWidthsAsFractions() {
        let columnWidths = "";
        for (const [i, header] of this.columnHeaders.entries()) {
            const width = header.offsetWidth;
            const unit = this.columns[i]?.fixed ? "px" : "fr";
            columnWidths += width + unit;
            columnWidths += " ";
        }
        if (this.parentElement) {
            this.parentElement.style.gridTemplateColumns = columnWidths;
        }
    }

    private beginResizeColumn(index: number) {
        const headerBeingResized = this.columnHeaders[index];
        if (headerBeingResized === undefined) {
            return;
        }
        const originalWidth = headerBeingResized.offsetWidth;

        // Use this aborter signal when registering event handlers that should
        // be automatically removed once when we're done.
        const aborter = new AbortController();
        headerBeingResized.addEventListener(
            "resize-handle-drag-end",
            () => {
                requestIdleCallback(() => {
                    aborter.abort();
                });
            },
            { signal: aborter.signal },
        );

        if (this.resizeMode === "fixed") {
            headerBeingResized.addEventListener(
                "resize-handle-moved",
                ev => {
                    const newWidth = Math.max(
                        originalWidth + ev.detail.deltaX,
                        HeaderElement.MIN_COL_WIDTH,
                    );
                    this.columnWidths[index] = newWidth;
                    this.applyColumnWidths(this.columnWidths);
                },
                { signal: aborter.signal },
            );
        } else if (this.resizeMode === "fit") {
            // We will take/give width from/to the first non-fixed header to the
            // right of the one being resized, preserving the overall width
            const neighborIndex = this.getResizeTarget(index);
            if (neighborIndex === undefined) {
                return;
            }
            const neighborHeader = this.columnHeaders[neighborIndex];
            if (neighborHeader === undefined) {
                return;
            }
            const neighborOriginalWidth = neighborHeader.offsetWidth;

            // While resizing, we temporarily switch to specifying all column
            // widths in pixels, so we have precise control over them.
            this.columnWidths = this.columnHeaders.map(header => header.offsetWidth);
            this.applyColumnWidths(this.columnWidths);

            headerBeingResized.addEventListener(
                "resize-handle-drag-end",
                () => {
                    // Go back to fraction-based sizing, so things scale nicely
                    this.applyRenderedWidthsAsFractions();
                },
                { signal: aborter.signal },
            );

            headerBeingResized.addEventListener(
                "resize-handle-moved",
                ev => {
                    let newWidth = Math.max(
                        originalWidth + ev.detail.deltaX,
                        HeaderElement.MIN_COL_WIDTH,
                    );
                    let neighborNewWidth =
                        neighborOriginalWidth - (newWidth - originalWidth);
                    if (neighborNewWidth < HeaderElement.MIN_COL_WIDTH) {
                        newWidth -=
                            HeaderElement.MIN_COL_WIDTH - neighborNewWidth;
                        neighborNewWidth = HeaderElement.MIN_COL_WIDTH;
                    }
                    if (
                        newWidth >= HeaderElement.MIN_COL_WIDTH &&
                        neighborNewWidth >= HeaderElement.MIN_COL_WIDTH
                    ) {
                        this.columnWidths[index] = newWidth;
                        this.columnWidths[neighborIndex] = neighborNewWidth;
                        this.applyColumnWidths(this.columnWidths);
                    }
                },
                { signal: aborter.signal },
            );
        }
    }

    // When in resize mode 'fit', get the column to take/give space from when resizing
    // column 'columnIndex'. Usually, this is simply the one to the right of it,
    // but we must skip columns that have fixed width.
    private getResizeTarget(columnIndex: number): number | undefined {
        for (let i = columnIndex + 1; i < this.columns.length; i++) {
            if (!this.columns[i]?.fixed) {
                return i;
            }
        }
        return undefined;
    }
}
