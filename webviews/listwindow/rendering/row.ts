/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Row, Target } from "../thrift/listwindow_types";
import { CellElement } from "./cell/cell";
import { CellBorderVariables } from "./cell/cellBorders";
import { DragDropService } from "./dragDropService";
import { HoverService } from "./hoverService";
import { createCss } from "./styles/createCss";
import { Theming } from "./styles/theming";
import { customElement } from "./utils";

/**
 * A non-header row in a listwindow. This handles setting outlines and
 * backgrounds of cells.
 */
@customElement("listwindow-row")
export class RowElement extends HTMLElement {
    // These styles are injected into the grid element's shadow DOM, since this
    // element has no shadow DOM of its own
    static readonly STYLES = createCss({
        "listwindow-row": {
            display: "contents",
            "box-sizing": "border-box",
        },
        "listwindow-row>*": {
            "border-bottom": `1px var(${Theming.Variables.GridLineStyle}) var(${Theming.Variables.GridLineColor})`,
            "border-right": `1px var(${Theming.Variables.GridLineStyle}) var(${Theming.Variables.GridLineColor})`,
        },


        "listwindow-row>.drop-target": {
            background: "var(--vscode-list-dropBackground) !important",
            color: "inherit !important",
        },

        // Highlight selected row(s)
        "listwindow-row.selected>*": {
            "border-right-color": "rgba(0, 0, 0, 0)",
            "background-color": `var(${Theming.Variables.ListSelectionBg})`,
            color: `var(${Theming.Variables.ListSelectionFg})`,

            [`${CellBorderVariables.Style}`]: `var(${Theming.Variables.ListSelectionOutlineStyle})`,
            [`${CellBorderVariables.ColorTop}`]: `var(${Theming.Variables.ListSelectionOutlineColor})`,
            [`${CellBorderVariables.ColorBottom}`]: `var(${Theming.Variables.ListSelectionOutlineColor})`,
            [`${CellBorderVariables.StyleLeft}`]: "none",
            [`${CellBorderVariables.StyleRight}`]: "none",
        },
        "listwindow-row.selected>:first-child": {
            [`${CellBorderVariables.StyleLeft}`]: `var(${Theming.Variables.ListSelectionOutlineStyle})`,
            [`${CellBorderVariables.ColorLeft}`]: `var(${Theming.Variables.ListSelectionOutlineColor}, var(${Theming.Variables.ListSelectionBg}))`,
        },
        "listwindow-row.selected>:last-child": {
            [`${CellBorderVariables.StyleRight}`]: `var(${Theming.Variables.ListSelectionOutlineStyle})`,
            [`${CellBorderVariables.ColorRight}`]: `var(${Theming.Variables.ListSelectionOutlineColor}, var(${Theming.Variables.ListSelectionBg}))`,
        },
        // Remove adjacent borders of non-selected rows
        "listwindow-row:not(.selected):has(+listwindow-row.selected)>*": {
            [`${CellBorderVariables.StyleBottom}`]: "none",
        },
        ":is(listwindow-row.selected)+listwindow-row:not(.selected)>*": {
            [`${CellBorderVariables.StyleTop}`]: "none",
        },

        // Highlight hovered row(s)
        "listwindow-row:hover:not(.selected)>*": {
            "background-color": "var(--vscode-list-hoverBackground)",
            [`${CellBorderVariables.StyleTop}`]: "dotted",
            [`${CellBorderVariables.ColorTop}`]: `var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))`,
            [`${CellBorderVariables.StyleBottom}`]: "dotted",
            [`${CellBorderVariables.ColorBottom}`]: `var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))`,
            [`${CellBorderVariables.ColorLeft}`]: "rgba(0, 0, 0, 0)",
            [`${CellBorderVariables.ColorRight}`]: `var(--vscode-list-hoverBackground)`,
        },
        "listwindow-row:hover:not(.selected)>:first-child": {
            [`${CellBorderVariables.StyleLeft}`]: "dotted",
            [`${CellBorderVariables.ColorLeft}`]: `var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))`,
        },
        "listwindow-row:hover:not(.selected)>:last-child": {
            [`${CellBorderVariables.StyleRight}`]: "dotted",
            [`${CellBorderVariables.ColorRight}`]: `var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0))`,
        },
        // Remove adjacent borders of non-hovered, non-selected rows
        "listwindow-row:not(.selected):has(+listwindow-row:hover)>*": {
            [`${CellBorderVariables.StyleBottom}`]: "none",
        },
        ":is(listwindow-row:hover)+listwindow-row:not(.selected)>*": {
            [`${CellBorderVariables.StyleTop}`]: "none",
        },
    });

    row?: Row = undefined;
    index = -1;
    selected = false;
    dragDropService: DragDropService | undefined = undefined;

    hoverService: HoverService | undefined = undefined;

    constructor() {
        super();
    }

    connectedCallback() {
        if (!this.row) {
            // TODO: render an empty row?
            return;
        }
        for (const [x, cell] of this.row.cells.entries()) {
            const cellElem = new CellElement();
            cellElem.cell = cell;
            if (x === 0) {
                cellElem.treeinfo = this.row.treeinfo;
            }
            cellElem.selected = this.selected;
            cellElem.position = { col: x, row: this.index };
            cellElem.hoverService = this.hoverService;
            cellElem.dragDropService = this.dragDropService;

            this.appendChild(cellElem);
        }

        if (this.selected) {
            this.classList.add("selected");
        }

        const dragFeedback = this.dragDropService?.currentFeedback;
        if (dragFeedback?.target === Target.kTargetCell) {
            if (dragFeedback.row === this.index) {
                this.children[dragFeedback.col]?.classList.add(
                    "drop-target",
                );
            }
        } else if (dragFeedback?.target === Target.kTargetRow) {
            if (dragFeedback.row === this.index) {
                for (const child of this.children) {
                    child.classList.add("drop-target");
                }
            }
        } else if (dragFeedback?.target === Target.kTargetColumn) {
            this.children[dragFeedback.col]?.classList.add(
                "drop-target",
            );
        }
    }
}
