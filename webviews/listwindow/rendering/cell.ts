/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../events";
import { Cell, TextStyle } from "../thrift/listwindow_types";
import { Styles } from "./styles";
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

/**
 * A single cell in a listwindow
 */
@customElement("listwindow-cell", { extends: "td" })
export class CellElement extends HTMLTableCellElement {
    // These styles are injected into the grid element's shadow DOM, since this
    // element has no shadow DOM of its own
    static readonly STYLES: Styles.StyleRules = {
        td: {
            cursor: "default",
            "white-space": "nowrap",
            "word-break": "keep-all",
            "max-width": 0, // always overflow rather than taking up space
        },
        "td.editable": {
            cursor: "pointer",
        },

        "td.selected": {
            "border-right": "none !important",
            "background-color": "var(--vscode-list-inactiveSelectionBackground)",
            color: "var(--vscode-list-inactiveSelectionForeground)",
        },
        [`.${Styles.CLASS_VIEW_FOCUSED} td.selected`]: {
            "background-color": "var(--vscode-list-activeSelectionBackground)",
            color: "var(--vscode-list-activeSelectionForeground)",
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
    };

    cell?: Cell = undefined;
    position: CellPosition = { col: -1, row: -1 };
    selected = false;

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

        // Add styles
        if (this.selected) {
            this.classList.add("selected");
        }

        if (this.cell.format.editable) {
            this.classList.add("editable");
        }
        this.classList.add(Styles.alignmentToClass(this.cell.format.align));

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
