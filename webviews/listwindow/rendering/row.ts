/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { Row, Target } from "../thrift/listwindow_types";
import { CellElement } from "./cell/cell";
import { CellBorderVariables } from "./cell/cellBorders";
import { DragDropService } from "./dragDropService";
import { HoverService } from "./hoverService";
import { Theming } from "./styles/theming";
import { customElement } from "./utils";
import { SharedStyles } from "./styles/sharedStyles";

/**
 * A non-header row in a listwindow. This handles setting outlines and
 * backgrounds of cells.
 */
@customElement("listwindow-row")
export class RowElement extends HTMLElement {
    row?: Row = undefined;
    index = -1;
    selected = false;
    dragDropService: DragDropService | undefined = undefined;

    hoverService: HoverService | undefined = undefined;

    constructor() {
        super();
    }

    connectedCallback() {
        this.classList.add(Styles.self);

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
            this.classList.add("selected-row");
        }

        const dragFeedback = this.dragDropService?.currentFeedback;
        if (dragFeedback?.target === Target.kTargetCell) {
            if (dragFeedback.row === this.index) {
                this.children[dragFeedback.col]?.classList.add(
                    SharedStyles.dropTarget
                );
            }
        } else if (dragFeedback?.target === Target.kTargetRow) {
            if (dragFeedback.row === this.index) {
                for (const child of this.children) {
                    child.classList.add(SharedStyles.dropTarget);
                }
            }
        } else if (dragFeedback?.target === Target.kTargetColumn) {
            this.children[dragFeedback.col]?.classList.add(
                SharedStyles.dropTarget,
            );
        }
    }
}

namespace Styles {
    export const self = css([{
        display: "contents",
        boxSizing: "border-box",
    },
    css`
        >* {
            border-bottom: 1px var(${Theming.Variables.GridLineStyle}) var(${Theming.Variables.GridLineColor});
            border-right: 1px var(${Theming.Variables.GridLineStyle}) var(${Theming.Variables.GridLineColor});
        }
        /* Highlight selected row(s) */
        &.selected-row>* {
            border-right-color: rgba(0, 0, 0, 0);
            background-color: var(${Theming.Variables.ListSelectionBg});
            color: var(${Theming.Variables.ListSelectionFg});

            ${CellBorderVariables.Style}: var(${Theming.Variables.ListSelectionOutlineStyle});
            ${CellBorderVariables.ColorTop}: var(${Theming.Variables.ListSelectionOutlineColor});
            ${CellBorderVariables.ColorBottom}: var(${Theming.Variables.ListSelectionOutlineColor});
            ${CellBorderVariables.StyleLeft}: none;
            ${CellBorderVariables.StyleRight}: none;
        }
        &.selected-row>:first-child {
            ${CellBorderVariables.StyleLeft}: var(${Theming.Variables.ListSelectionOutlineStyle});
            ${CellBorderVariables.ColorLeft}: var(${Theming.Variables.ListSelectionOutlineColor}, var(${Theming.Variables.ListSelectionBg}));
        }
        &.selected-row>:last-child {
            ${CellBorderVariables.StyleRight}: var(${Theming.Variables.ListSelectionOutlineStyle});
            ${CellBorderVariables.ColorRight}: var(${Theming.Variables.ListSelectionOutlineColor}, var(${Theming.Variables.ListSelectionBg}));
        }
        /* Remove adjacent borders of non-selected rows */
        &:not(.selected-row):has(+&.selected-row)>* {
            ${CellBorderVariables.StyleBottom}: none;
        }
        &:is(.selected-row)+&:not(.selected-row)>* {
            ${CellBorderVariables.StyleTop}: none;
        }

        /* Highlight hovered row(s) */
        &:hover:not(.selected-row)>* {
            background-color: var(--vscode-list-hoverBackground);
            ${CellBorderVariables.StyleTop}: dotted;
            ${CellBorderVariables.ColorTop}: var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0));
            ${CellBorderVariables.StyleBottom}: dotted;
            ${CellBorderVariables.ColorBottom}: var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0));
            ${CellBorderVariables.ColorLeft}: rgba(0, 0, 0, 0);
            ${CellBorderVariables.ColorRight}: var(--vscode-list-hoverBackground);
        }
        &:hover:not(.selected-row)>:first-child {
            ${CellBorderVariables.StyleLeft}: dotted;
            ${CellBorderVariables.ColorLeft}: var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0));
        }
        &:hover:not(.selected-row)>:last-child {
            ${CellBorderVariables.StyleRight}: dotted;
            ${CellBorderVariables.ColorRight}: var(--vscode-contrastActiveBorder, rgba(0, 0, 0, 0));
        }
        /* Remove adjacent borders of non-hovered, non-selected rows */
        &:not(.selected-row):has(+&:hover)>* {
            ${CellBorderVariables.StyleBottom}: none;
        }
        &:is(:hover)+&:not(.selected-row)>* {
            ${CellBorderVariables.StyleTop}: none;
        }
    `]);
}
