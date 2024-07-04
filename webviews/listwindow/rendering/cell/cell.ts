/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../../events";
import { Cell, TextStyle } from "../../thrift/listwindow_types";
import { HoverService } from "../hoverService";
import { createCss } from "../styles/createCss";
import { SharedStyles } from "../styles/sharedStyles";
import { Theming } from "../styles/theming";
import { customElement } from "../utils";
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

/**
 * A single cell in a listwindow
 */
@customElement("listwindow-cell")
export class CellElement extends HTMLElement {
    // Styles that need to be applied to the td itself, outside its shadow root.
    // These are injected into the grid element's shadow DOM
    static readonly TD_STYLES = createCss({
        "listwindow-cell": {
            padding: 0,
            overflow: "hidden",
        },
        // The margins and transforms here are a hacky way to negate the space the
        // borders take up, so that hovering/selection doesn't affect the size
        // of the cell
        "listwindow-cell.selected": {
            "border-right": "none",
            "background-color": `var(${Theming.Variables.ListSelectionBg})`,
            color: `var(${Theming.Variables.ListSelectionFg})`,
            "border-top": `1px var(${Theming.Variables.ListSelectionOutlineStyle}) var(${Theming.Variables.ListSelectionOutlineColor})`,
            "margin-top": "-1px",
            "border-bottom": `1px var(${Theming.Variables.ListSelectionOutlineStyle}) var(${Theming.Variables.ListSelectionOutlineColor})`,
            "margin-bottom": "-1px",
            "z-index": 10,
        },
        "listwindow-cell.selected:first-child": {
            "border-left": `1px var(${Theming.Variables.ListSelectionOutlineStyle}) var(${Theming.Variables.ListSelectionOutlineColor})`,
        },
        "listwindow-cell.selected:first-child>*": {
            transform: "translate(-1px)",
        },
        "listwindow-cell.selected:last-child": {
            "border-right": `1px var(${Theming.Variables.ListSelectionOutlineStyle}) var(${Theming.Variables.ListSelectionOutlineColor})`,
        },

        ":hover>listwindow-cell:not(.selected)": {
            "background-color": "var(--vscode-list-hoverBackground)",
            "border-top": "1px dotted var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))",
            "margin-top": "-1px",
            "border-bottom": "1px dotted var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))",
            "margin-bottom": "-1px",
        },
        ":hover>listwindow-cell:not(.selected):first-child": {
            "border-left": "1px dotted var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))",
        },
        ":hover:not(.selected)>listwindow-cell:not(.selected):first-child>*": {
            transform: "translate(-1px)",
        },
        ":hover>listwindow-cell:not(.selected):last-child": {
            "border-right": "1px dotted var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))",
        },
    });

    private static readonly STYLES = createCss({
        ":host": {
            padding: 0,
            height: "100%",
        },
        "#text::before": {
            "content": "aa",
        },
        "#inner-root": {
            height: "22px",
            "line-height": "22px",
            // We use 'grid' to allow a checkbox or expand/collapse button at
            // the start, with the text taking up the rest of the space.
            display: "grid",
            "grid-template-columns": "max-content auto",
            "align-items": "center",
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

    connectedCallback() {
        if (!this.cell) {
            return;
        }

        const outerRoot = document.createElement("div");
        this.appendChild(outerRoot);
        const shadow = outerRoot.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(CellElement.STYLES);
        shadow.adoptedStyleSheets.push(...SharedStyles.STYLES);

        // Add content
        const innerRoot = document.createElement("div");
        innerRoot.id = "inner-root";
        shadow.appendChild(innerRoot);

        if (this.treeinfo) {
            const treeInfoElem = new TreeInfoElement();
            treeInfoElem.treeinfo = this.treeinfo;
            treeInfoElem.row = this.position.row;
            innerRoot.appendChild(treeInfoElem);
        }

        const text = document.createElement("div");
        text.id = "text";
        text.innerText = this.cell?.text;
        innerRoot.appendChild(text);

        // Add event handlers
        this.onclick = ev => {
            if (ev.button === 0) {
                const event = createCustomEvent("cell-clicked", {
                    detail: {
                        ...this.position,
                        isDoubleClick: ev.detail === 2,
                        ctrlPressed: ev.ctrlKey,
                        shiftPressed: ev.shiftKey,
                    },
                    bubbles: true,
                    composed: true,
                });
                this.dispatchEvent(event);
            }
        };
        this.oncontextmenu = ev => {
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
                            isTruncated: this.scrollWidth > this.clientWidth,
                        },
                    },
                    bubbles: true,
                    composed: true,
                }),
            );
        });

        // Add styles
        this.classList.add(SharedStyles.CLASS_GRID_ITEM);

        if (this.selected) {
            this.classList.add("selected");
        }

        if (this.cell.format.editable) {
            innerRoot.classList.add("editable");
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
}
