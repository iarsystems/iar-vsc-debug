/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../../events";
import { Cell, TextStyle } from "../../thrift/listwindow_types";
import { DragDropService } from "../dragDropService";
import { HoverService } from "../hoverService";
import { createCss } from "../styles/createCss";
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
    // Styles that need to be applied to the element itself, outside its shadow
    // root. These are injected into the grid element's shadow DOM
    static readonly OUTER_STYLES = createCss({
        "listwindow-cell": {
            padding: 0,
            position: "relative",
            overflow: "hidden",
        },
    });

    private static readonly STYLES = createCss({
        ":host": {
            padding: 0,
            height: "100%",
        },
        "#inner-root": {
            height: "22px",
            "line-height": "22px",
            // We use 'grid' to allow a checkbox or expand/collapse button at
            // the start, with the text taking up the rest of the space.
            display: "grid",
            "grid-template-columns": "max-content auto",
            "align-items": "center",
            "user-select": "none",
        },
        "#text": {
            "grid-column": 2,
            padding: "0px 12px",
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
            "word-break": "keep-all",
        },
        "#text:not(:first-child)": {
            "padding-left": "3px",
        },
        ".editable": {
            cursor: "pointer",
        },

        ".text-style-fixed": {
            "font-family": "var(--vscode-editor-font-family)",
        },
        ".text-style-proportional": {
            "font-family": "var(--vscode-font-family)",
        },
        ".text-style-bold": {
            "font-weight": "bold",
        },
        ".text-style-italic": {
            "font-style": "italic",
        },
    });

    cell?: Cell = undefined;
    /** Should be set on the first cell of a row to render indentation and expand/collapse icon */
    treeinfo: string | undefined = undefined;
    position: CellPosition = { col: -1, row: -1 };
    selected = false;

    hoverService: HoverService | undefined = undefined;
    dragDropService: DragDropService | undefined = undefined;

    private innerRoot: HTMLElement | undefined = undefined;

    connectedCallback() {
        if (!this.cell) {
            return;
        }
        this.setAttribute(CellElement.ATTR_COL, this.position.col.toString());
        this.setAttribute(CellElement.ATTR_ROW, this.position.row.toString());

        const outerRoot = document.createElement("div");
        this.appendChild(outerRoot);
        const shadow = outerRoot.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(CellElement.STYLES);
        shadow.adoptedStyleSheets.push(...SharedStyles.STYLES);

        // Add content
        this.innerRoot = document.createElement("div");
        this.innerRoot.id = "inner-root";
        shadow.appendChild(this.innerRoot);

        if (this.treeinfo) {
            const treeInfoElem = new TreeInfoElement();
            treeInfoElem.treeinfo = this.treeinfo;
            treeInfoElem.row = this.position.row;
            this.innerRoot.appendChild(treeInfoElem);
        }

        const text = document.createElement("div");
        text.id = "text";
        text.innerText = this.cell?.text;
        this.innerRoot.appendChild(text);

        this.appendChild(new CellBordersElement);

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
                            isTruncated: text.scrollWidth > text.clientWidth,
                        },
                    },
                    bubbles: true,
                    composed: true,
                }),
            );
        });

        this.dragDropService?.registerDraggableCell(this);
        this.dragDropService?.registerDropTarget(
            this,
            this.position,
            this.cell.drop,
        );

        // Add styles
        if (this.selected) {
            this.classList.add("selected");
        }

        if (this.cell.format.editable) {
            this.innerRoot.classList.add("editable");
        }

        text.classList.add(
            SharedStyles.alignmentToClass(this.cell.format.align),
        );

        if (
            [
                TextStyle.kFixedPlain,
                TextStyle.kFixedBold,
                TextStyle.kFixedBoldItalic,
                TextStyle.kFixedItalic,
            ].includes(this.cell.format.style)
        ) {
            text.classList.add("text-style-fixed");
        } else {
            text.classList.add("text-style-proportional");
        }
        if (
            [
                TextStyle.kFixedBold,
                TextStyle.kFixedBoldItalic,
                TextStyle.kProportionalBold,
                TextStyle.kProportionalBoldItalic,
            ].includes(this.cell.format.style)
        ) {
            text.classList.add("text-style-bold");
        }
        if (
            [
                TextStyle.kFixedItalic,
                TextStyle.kFixedBoldItalic,
                TextStyle.kProportionalItalic,
                TextStyle.kProportionalBoldItalic,
            ].includes(this.cell.format.style)
        ) {
            text.classList.add("text-style-italic");
        }
    }

    override onclick = (ev: MouseEvent) => {
        if (ev.button === 0) {
            if (this.cell?.format.editable && this.innerRoot) {
                this.dispatchEvent(
                    createCustomEvent("cell-edit-requested", {
                        detail: {
                            ...this.position,
                            cellBounds: this.innerRoot.getBoundingClientRect(),
                        },
                        bubbles: true,
                        composed: true,
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
                    composed: true,
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
            composed: true,
        });
        this.dispatchEvent(event);
    };

}
