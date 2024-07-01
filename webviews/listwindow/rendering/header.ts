/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../events";
import { ColumnResizeMode } from "../protocol";
import { Column } from "../thrift/listwindow_types";
import { ResizeHandleElement, ResizeHandleMovedEvent } from "./resizeHandle";
import { Styles } from "./styles";
import { customElement } from "./utils";

/**
 * Emitted when the the user has resized a column
 */
export type ColumnsResizedEvent = CustomEvent<ColumnsResizedEvent.Detail>;
export namespace ColumnsResizedEvent {
    export interface Detail {
        /** The new column widths in pixels. */
        newColumnWidths: number[]
    }
}

/**
 * A header row in a listwindow. These cells determine the width of each column,
 * and can be resizeable.
 */
@customElement("listwindow-header", { extends: "tr" })
export class HeaderElement extends HTMLTableRowElement {
    // These styles are injected into the grid element's shadow DOM
    static readonly STYLES: Styles.StyleRules = {
        th: {
            position: "relative",
            cursor: "default",
            "box-sizing": "border-box",
            // Make header cells a bit bigger than normal ones
            "font-size": "1.1em",
            "padding-bottom": "4px",
            "padding-top": "4px",
        },
        "th.clickable:hover": {
            "background-color": "var(--vscode-list-hoverBackground)",
        },
    };

    private static readonly MIN_COL_WIDTH = 25;

    columns: Column[] = [];
    initialColumnWidths: number[] = [];
    clickable = false;
    resizeMode: ColumnResizeMode = "fixed";

    private columnHeaders: HTMLTableCellElement[] = [];

    connectedCallback() {
        this.columnHeaders = [];

        for (const [i, column] of this.columns.entries()) {
            const th = document.createElement("th");
            this.columnHeaders.push(th);
            if (this.clickable) {
                th.classList.add("clickable");
            }

            const width = this.initialColumnWidths[i];
            if (width !== undefined) {
                applyWidth(th, width + "px");
            }
            this.appendChild(th);

            const div = document.createElement("div");
            div.innerText = column.title;

            div.classList.add(
                Styles.alignmentToClass(column.defaultFormat.align),
            );

            th.appendChild(div);

            let addHandle = true;
            if (this.resizeMode === "fit" && i === this.columns.length - 1) {
                // In 'fit' mode it doesn't make sense to have a resize handle
                // at the rightmost edge of the table
                addHandle = false;
            } else if (column.fixed) {
                addHandle = false;
            }

            if (addHandle) {
                const handle = new ResizeHandleElement();
                th.addEventListener("resize-handle-drag-begin", () => {
                    this.beginResizeColumn(i);
                });
                th.addEventListener("resize-handle-drag-end", () => {
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
                th.appendChild(handle);
            }
        }

        if (this.resizeMode === "fit") {
            // The 'fit' mode uses percentages so that columns scale
            // proportionally.
            this.applyRenderedWidthsToStyleAsPercentages();
        }
    }

    // Make sure the widths set on each header represents the rendered
    // width in pixels. This is only really a concern for resizeMode 'fit'.
    private applyRenderedWidthsToStyleAsPixels() {
        for (const th of this.columnHeaders) {
            const width = th.offsetWidth;
            applyWidth(th, width + "px");
        }
    }
    private applyRenderedWidthsToStyleAsPercentages() {
        const totalWidth = this.columnHeaders.reduce(
            (sum, th) => sum + th.offsetWidth,
            0,
        );
        for (const th of this.columnHeaders) {
            const percentage = th.offsetWidth / totalWidth * 100;
            applyWidth(th, percentage + "%");
        }
    }

    private beginResizeColumn(index: number) {
        const headerBeingResized = this.columnHeaders[index];
        if (headerBeingResized === undefined) {
            return;
        }
        const originalWidth = headerBeingResized.offsetWidth;

        if (this.resizeMode === "fixed") {
            const onMove = (ev: ResizeHandleMovedEvent) => {
                const newWidth = Math.max(
                    originalWidth + ev.detail.deltaX,
                    HeaderElement.MIN_COL_WIDTH,
                );
                applyWidth(headerBeingResized, newWidth + "px");
            };
            headerBeingResized.addEventListener("resize-handle-moved", onMove);

            const onEnd = () => {
                headerBeingResized.removeEventListener("resize-handle-moved", onMove);
                headerBeingResized.removeEventListener("resize-handle-drag-end", onEnd);
            };
            headerBeingResized.addEventListener("resize-handle-drag-end", onEnd);

        } else if (this.resizeMode === "fit") {
            // We will take/give width from/to the header to the right of the
            // one being resized, preserving the overall width
            const neighborHeader = this.columnHeaders[index + 1];
            if (neighborHeader === undefined) {
                return;
            }
            const neighborOriginalWidth = neighborHeader.offsetWidth;

            // While resizing, we want to specify widths in pixels, so we have
            // precise control over it.
            this.applyRenderedWidthsToStyleAsPixels();

            const onMove = (ev: ResizeHandleMovedEvent) => {
                let newWidth = Math.max(
                    originalWidth + ev.detail.deltaX,
                    HeaderElement.MIN_COL_WIDTH,
                );
                let neighborNewWidth =
                    neighborOriginalWidth - (newWidth - originalWidth);
                if (neighborNewWidth < HeaderElement.MIN_COL_WIDTH) {
                    newWidth -= HeaderElement.MIN_COL_WIDTH - neighborNewWidth;
                    neighborNewWidth = HeaderElement.MIN_COL_WIDTH;
                }
                if (
                    newWidth >= HeaderElement.MIN_COL_WIDTH &&
                    neighborNewWidth >= HeaderElement.MIN_COL_WIDTH
                ) {
                    applyWidth(headerBeingResized, newWidth + "px");
                    applyWidth(neighborHeader, neighborNewWidth + "px");
                }
            };
            headerBeingResized.addEventListener("resize-handle-moved", onMove);

            const onEnd = () => {
                // Now we can go back to percentage-based sizing, so things
                // scale nicely
                this.applyRenderedWidthsToStyleAsPercentages();

                headerBeingResized.removeEventListener("resize-handle-moved", onMove);
                headerBeingResized.removeEventListener("resize-handle-drag-end", onEnd);
            };
            headerBeingResized.addEventListener("resize-handle-drag-end", onEnd);
        }
    }

}

function applyWidth(elem: HTMLElement, width: string) {
    elem.style.width = width;
    // For some reason table cells need minWidth and maxWidth too, otherwise it
    // sizes up to fit the content...
    elem.style.minWidth = width;
    elem.style.maxWidth = width;
}