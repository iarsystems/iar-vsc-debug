/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../../../shared/events";
import { ColumnResizeMode, Serializable } from "../../../shared/protocol";
import { ResizeHandleElement } from "./resizeHandle";
import { customElement } from "../../../shared/utils";
import { Column } from "../../../shared/thrift/listwindow_types";
import { SharedStyles } from "../styles/sharedStyles";
import { Theming } from "../styles/theming";
import { css } from "@emotion/css";
import { MessageService } from "../../../shared/messageService";

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
 * Emitted when the the user has clicked a column header
 */
export type ColumnClickedEvent = CustomEvent<ColumnClickedEvent.Detail>;
export namespace ColumnClickedEvent {
    export interface Detail {
        col: number;
    }
}

/**
 * A header row in a listwindow. Handles resizing of columns.
 */
@customElement("listwindow-header")
export class HeaderElement extends HTMLElement {
    private static readonly MIN_COL_WIDTH = 25;

    columns: Serializable<Column>[] = [];
    columnWidths: number[] = [];
    clickable = false;
    resizeMode: ColumnResizeMode = "fixed";
    messageService: MessageService | undefined = undefined;

    private columnHeaders: HTMLElement[] = [];

    /**
     * Gets the height of the header row in pixels.
     * Since the header row uses display: contents, it can't be measured the
     * normal way with clientHeight/offsetHeight.
     */
    getHeight() {
        return this.columnHeaders[0]?.offsetHeight ?? 0;
    }

    connectedCallback() {
        this.classList.add(Styles.self);
        this.columnHeaders = [];

        for (const [i, column] of this.columns.entries()) {
            const colHeader = document.createElement("span");
            this.columnHeaders.push(colHeader);
            this.appendChild(colHeader);

            const title = document.createElement("div");
            title.classList.add(Styles.title);
            title.textContent = column.title;
            colHeader.appendChild(title);

            if (this.clickable) {
                title.classList.add(Styles.clickable);
                title.onclick = () => {
                    this.messageService?.sendMessage({
                        subject: "columnClicked",
                        col: i,
                    });
                };
            }

            colHeader.classList.add(
                SharedStyles.alignmentToStyle(column.defaultFormat.align),
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
                handle.addEventListener("resize-handle-drag-begin", () => {
                    this.beginResizeColumn(i);
                });
                handle.addEventListener("resize-handle-drag-end", () => {
                    // When we're finished resizing, we should check what the
                    // *actual* width became and store that for when we
                    // re-render
                    requestAnimationFrame(() => {
                        const widths = this.columnHeaders.map(th => th.offsetWidth);
                        this.dispatchEvent(createCustomEvent("columns-resized", {
                            detail: { newColumnWidths: widths },
                            bubbles: true,
                        }));
                    });
                });
                colHeader.appendChild(handle);
            }
        }

        if (this.resizeMode === "fixed") {
            // This is a filler column that takes up the remaining space
            this.appendChild(document.createElement("span"));
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
        // In fixed mode, there is a filler column that should take up the
        // remaining space
        if (this.resizeMode === "fixed") {
            columnWidths += "auto";
        }

        if (this.parentElement) {
            this.parentElement.style.gridTemplateColumns = columnWidths;
        }
    }

    // Changes the width of each (non-fixed-width) column to be specified as a
    // "fraction" based on its current rendered width. This makes the columns
    // scale proportionally to their fraction value.
    private applyRenderedWidthsAsFractions() {
        let columnWidths = "";
        for (const [i, header] of this.columnHeaders.entries()) {
            let width = header.offsetWidth + "fr";
            const columnSpec = this.columns[i];
            if (columnSpec?.fixed) {
                width = columnSpec.width + "px";
            }
            columnWidths += width + " ";
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

namespace Styles {
    export const self = css([
        {
            display: "contents",
            padding: "2px 0px",
            // Make header cells a bit bigger than normal ones
            lineHeight: "27px",
            fontWeight: "normal",
            textTransform: "uppercase",
            fontSize: "11px",
        },
        css`
            >* {
                position: relative;
                width: 100%;
                user-select: none;
                overflow: hidden;
                background: var(--vscode-sideBar-background);
                box-sizing: border-box;
                border-bottom: 1px var(${Theming.Variables.GridLineStyle})
                    var(${Theming.Variables.GridLineColor});
                border-right: 1px var(${Theming.Variables.GridLineStyle})
                    var(${Theming.Variables.GridLineColor});
            }
        `,
    ]);
    export const title = css({
        overflow: "hidden",
        textOverflow: "ellipsis",
        textWrap: "nowrap",
        padding: "0px 6px",
        boxSizing: "border-box",
        maxWidth: "100%",
    });
    export const clickable = css`
        &:hover {
            background-color: var(--vscode-list-hoverBackground);
            cursor: pointer;
        }
    `;
}
