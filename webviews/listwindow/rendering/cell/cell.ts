/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { createCustomEvent } from "../../events";
import { Cell, TextStyle } from "../../thrift/listwindow_types";
import { DragDropService } from "../dragDropService";
import { HoverService } from "../hoverService";
import { SharedStyles } from "../styles/sharedStyles";
import { customElement } from "../utils";
import { CellBordersElement } from "./cellBorders";
import { TreeInfoElement } from "./treeInfo";

export interface CellPosition {
    col: number;
    row: number;
}

/** Emitted when the the user left clicks a cell */
export type CellClickedEvent = CustomEvent<CellClickedEvent.Detail>;
export namespace CellClickedEvent {
    export interface Detail extends CellPosition {
        isDoubleClick: boolean;
        ctrlPressed: boolean;
        shiftPressed: boolean;
    }
}

/** Emitted when the the user left clicks a cell */
export type CellRightClickedEvent = CustomEvent<CellRightClickedEvent.Detail>;
export namespace CellRightClickedEvent {
    export interface Detail extends CellPosition {
        /** The position that was clicked, relative to the viewport */
        clickPosition: {
            x: number,
            y: number,
        }
    }
}

/** Emitted when the the user left clicks a cell */
export type CellHoveredEvent = CustomEvent<CellHoveredEvent.Detail>;
export namespace CellHoveredEvent {
    export interface Detail extends CellPosition {
        /** The position the mouse is in */
        hoverPosition: {
            x: number,
            y: number,
        },
        cellContent: {
            text?: string,
            /** Whether the text is cut off because it does not fit in the cell */
            isTruncated: boolean,
        },
    }
}

/** Emitted when the the user left clicks an editable cell */
export type CellEditRequestedEvent = CustomEvent<CellEditRequestedEvent.Detail>;
export namespace CellEditRequestedEvent {
    export interface Detail extends CellPosition {
        /**The bounding box of the cell to edit (as returned from getBoundingClientRect) */
        cellBounds: DOMRect;
    }
}

/**
 * A single cell in a listwindow
 */
@customElement("listwindow-cell")
export class CellElement extends HTMLElement {
    // Attributes set on each cell with its coordinates, to enable using
    // querySelector to lookup specific cells.
    static readonly ATTR_COL = "column";
    static readonly ATTR_ROW = "row";

    // This may be undefined for empty "filler" cells
    cell?: Cell = undefined;
    /** Should be set on the first cell of a row to render indentation and expand/collapse icon */
    treeinfo: string | undefined = undefined;
    position: CellPosition = { col: -1, row: -1 };
    selected = false;

    hoverService: HoverService | undefined = undefined;
    dragDropService: DragDropService | undefined = undefined;

    private content: HTMLElement | undefined = undefined;

    connectedCallback() {
        this.classList.add(Styles.self);

        this.setAttribute(CellElement.ATTR_COL, this.position.col.toString());
        this.setAttribute(CellElement.ATTR_ROW, this.position.row.toString());

        // Add content
        this.content = document.createElement("div");
        this.content.classList.add(Styles.content);
        this.appendChild(this.content);

        this.appendChild(new CellBordersElement);

        if (!this.cell) {
            return;
        }

        if (this.treeinfo) {
            const treeInfoElem = new TreeInfoElement();
            treeInfoElem.treeinfo = this.treeinfo;
            treeInfoElem.row = this.position.row;
            this.content.appendChild(treeInfoElem);
        }

        const label = document.createElement("div");
        label.classList.add(Styles.label);
        label.textContent = this.cell.text;
        this.content.appendChild(label);


        // Add event handlers
        const cellId = `${this.position.col},${this.position.row}`;
        this.hoverService?.registerHoverElement(this, cellId, pos => {
            this.dispatchEvent(
                createCustomEvent("cell-hovered", {
                    detail: {
                        ...this.position,
                        hoverPosition: {
                            x: pos.clientX,
                            y: pos.clientY,
                        },
                        cellContent: {
                            text: this.cell?.text,
                            isTruncated: label.scrollWidth > label.clientWidth,
                        },
                    },
                    bubbles: true,
                }),
            );
        });

        this.dragDropService?.registerDraggableCell(this);
        this.dragDropService?.registerDropTarget(
            this,
            this.position,
            this.cell.drop,
        );

        // Add conditional styles
        if (this.cell.format.editable) {
            this.content.classList.add(Styles.editable);
        }

        label.classList.add(
            SharedStyles.alignmentToStyle(this.cell.format.align),
        );

        if (
            [
                TextStyle.kFixedPlain,
                TextStyle.kFixedBold,
                TextStyle.kFixedBoldItalic,
                TextStyle.kFixedItalic,
            ].includes(this.cell.format.style)
        ) {
            label.classList.add(Styles.textStyleFixed);
        } else {
            label.classList.add(Styles.textStyleProportional);
        }
        if (
            [
                TextStyle.kFixedBold,
                TextStyle.kFixedBoldItalic,
                TextStyle.kProportionalBold,
                TextStyle.kProportionalBoldItalic,
            ].includes(this.cell.format.style)
        ) {
            label.classList.add(Styles.textStyleBold);
        }
        if (
            [
                TextStyle.kFixedItalic,
                TextStyle.kFixedBoldItalic,
                TextStyle.kProportionalItalic,
                TextStyle.kProportionalBoldItalic,
            ].includes(this.cell.format.style)
        ) {
            label.classList.add(Styles.textStyleItalic);
        }
    }

    override onclick = (ev: MouseEvent) => {
        if (ev.defaultPrevented) {
            // The click was already handled by a subelement (probably the treeinfo)
            return;
        }
        if (ev.button === 0) {
            if (this.cell?.format.editable && this.content) {
                this.dispatchEvent(
                    createCustomEvent("cell-edit-requested", {
                        detail: {
                            ...this.position,
                            cellBounds: this.content.getBoundingClientRect(),
                        },
                        bubbles: true,
                    }),
                );
                return;
            }
            this.dispatchEvent(
                createCustomEvent("cell-clicked", {
                    detail: {
                        ...this.position,
                        isDoubleClick: ev.detail === 2,
                        ctrlPressed: ev.ctrlKey,
                        shiftPressed: ev.shiftKey,
                    },
                    bubbles: true,
                }),
            );
        }
        return null;
    };

    override oncontextmenu = (ev: MouseEvent) => {
        ev.stopPropagation();
        const event = createCustomEvent("cell-right-clicked", {
            detail: {
                ...this.position,
                clickPosition: {
                    x: ev.clientX,
                    y: ev.clientY,
                },
            },
            bubbles: true,
        });
        this.dispatchEvent(event);
    };

}

namespace Styles {
    export const self = css({
        padding: 0,
        position: "relative",
        overflow: "hidden",
    });
    export const content = css({
        height: "22px",
        lineHeight: "22px",
        // We use 'grid' to allow a checkbox or expand/collapse button at
        // the start, with the label taking up the rest of the space.
        display: "grid",
        gridTemplateColumns: "max-content auto",
        alignItems: "center",
        userSelect: "none",
    });
    export const label = css([
        {
            gridColumn: 2,
            padding: "0px 12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            wordBreak: "keep-all",
        },
        css`
            :not(:first-child) {
                padding-left: 3px;
            }
        `,
    ]);
    export const editable = css({
        cursor: "pointer",
    });

    export const textStyleFixed = css({
        fontFamily: "var(--vscode-editor-font-family)",
    });
    export const textStyleProportional = css({
        fontFamily: "var(--vscode-font-family)",
    });
    export const textStyleBold = css({
        fontWeight: "bold",
    });
    export const textStyleItalic = css({
        fontStyle: "italic",
    });
}
