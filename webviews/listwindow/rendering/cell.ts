/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../events";
import { Cell, TextStyle } from "../thrift/listwindow_types";
import { HoverService } from "./hoverService";
import { createCss } from "./styles/createCss";
import { SharedStyles } from "./styles/sharedStyles";
import { Theming } from "./styles/theming";
import { customElement } from "./utils";

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
@customElement("listwindow-cell", { extends: "td" })
export class CellElement extends HTMLTableCellElement {
    // Styles that need to be applied to the td itself. These are injected into
    // the grid element's shadow DOM
    static readonly TD_STYLES: CSSStyleSheet = createCss({
        "td": {
            padding: 0,
        },
        "td.selected": {
            "border-right": "none !important",
            "background-color": `var(${Theming.Variables.ListSelectionBg})`,
            color: `var(${Theming.Variables.ListSelectionFg})`,
        }
    });

    private static readonly STYLES: CSSStyleSheet = createCss({
        ":host": {
            padding: 0,
        },
        "td.editable": {
            cursor: "pointer",
        },
        "#text": {
            overflow: "hidden",
            "text-overflow": "ellipsis",
            padding: "4px 12px",
            "white-space": "nowrap",
            "word-break": "keep-all",
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
    position: CellPosition = { col: -1, row: -1 };
    selected = false;

    hoverService: HoverService | undefined = undefined;

    connectedCallback() {
        if (!this.cell) {
            return;
        }

        this.innerText = this.cell.text;

        // Add event handlers
        this.addEventListener("click", ev => {
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
            } else if (ev.button === 2) {
            }
        });
        this.addEventListener("contextmenu", ev => {
            const event = createCustomEvent("cell-right-clicked", {
                detail: {
                    ...this.position,
                    clickPosition: {
                        x: ev.clientX,
                        y: ev.clientY,
                    }
                },
                bubbles: true,
                composed: true,
            });
            this.dispatchEvent(event);
        });
        const cellId = `${this.position.col},${this.position.row}`;
        this.hoverService?.registerHoverElement(this, cellId, pos => {
            this.dispatchEvent(createCustomEvent("cell-hovered", {
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
            }));
        });

        // Add styles
        if (this.selected) {
            this.classList.add("selected");
        }

        if (this.cell.format.editable) {
            this.classList.add("editable");
        }

        this.classList.add(SharedStyles.alignmentToClass(this.cell.format.align));

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
