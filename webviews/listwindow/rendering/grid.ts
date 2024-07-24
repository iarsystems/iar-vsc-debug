/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ColumnResizeMode, RenderParameters, Serializable } from "../protocol";
import { HeaderElement } from "./header/header";
import { RowElement } from "./row";
import { HoverService } from "./hoverService";
import { createCustomEvent } from "../events";
import { customElement, toBigInt } from "./utils";
import { CellElement } from "./cell/cell";
import { DragDropService } from "./dragDropService";
import { Target } from "../thrift/listwindow_types";
import { css } from "@emotion/css";
import { SharedStyles } from "./styles/sharedStyles";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
@customElement("listwindow-grid")
export class GridElement extends HTMLElement {
    data?: Serializable<RenderParameters> = undefined;
    initialColumnWidths: number[] | undefined = undefined;
    resizeMode: ColumnResizeMode = "fixed";

    hoverService: HoverService | undefined = undefined;
    dragDropService: DragDropService | undefined = undefined;

    connectedCallback() {
        this.classList.add(Styles.self);
        if (this.resizeMode === "fit") {
            this.classList.add(Styles.fillWidth);
        }

        if (!this.data) {
            // TODO: render some placeholder
            return;
        }

        if (this.initialColumnWidths === undefined) {
            this.initialColumnWidths = this.data.columnInfo.map(col => col.width);
        }

        this.dragDropService?.registerDropTarget(
            this,
            { col: -1, row: -1 },
            Target.kTargetAll,
        );
        if (this.dragDropService?.currentFeedback.target === Target.kTargetAll) {
            this.classList.add(SharedStyles.dropTarget);
        }

        const grid = document.createElement("div");
        grid.classList.add(Styles.grid);
        this.appendChild(grid);

        // Create header
        const header = new HeaderElement();
        header.columns = this.data.columnInfo;
        header.columnWidths = this.initialColumnWidths;
        header.clickable = this.data.listSpec.canClickColumns;
        header.resizeMode = this.resizeMode;
        grid.appendChild(header);

        if (!this.data.listSpec.showHeader) {
            header.style.display = "none";
        }

        // Create body
        const ranges = this.data.selection.map(range => {
            return {
                first: toBigInt(range.first),
                last: toBigInt(range.last),
            };
        });
        for (const [y, row] of this.data.rows.entries()) {
            const rowElem = new RowElement();
            rowElem.row = row;
            rowElem.index = y;
            rowElem.selected = ranges.some(
                range => range.first <= y && range.last >= y,
            );
            rowElem.showCheckBoxes = this.data.listSpec.showCheckBoxes;
            rowElem.addFillerCell = this.resizeMode === "fixed";
            rowElem.hoverService = this.hoverService;
            rowElem.dragDropService = this.dragDropService;
            grid.appendChild(rowElem);
        }

        // The rest of the vertical space is taken up by a filler element that
        // can be clicked to deselect everything
        const fillerBottom = document.createElement("div");
        fillerBottom.classList.add(Styles.fillerBottom);
        this.appendChild(fillerBottom);
        fillerBottom.onclick = (ev: MouseEvent) => {
            this.dispatchEvent(
                createCustomEvent("cell-clicked", {
                    detail: {
                        col: -1,
                        row: -1,
                        isDoubleClick: ev.detail === 2,
                        ctrlPressed: false,
                        shiftPressed: false,
                    },
                    bubbles: true,
                }),
            );
        };

    }

    override oncontextmenu = (ev: MouseEvent) => {
        this.dispatchEvent(createCustomEvent("cell-right-clicked", {
            detail: {
                col: -1,
                row: -1,
                clickPosition: ev,
            },
            bubbles: true,
        }));
    };

    ensureRowVisible(row: number) {
        if (row < 0) {
            return;
        }

        const firstRow = this.querySelector(
            `[${CellElement.ATTR_ROW}="0"]`,
        );
        const targetRow = this.querySelector(
            `[${CellElement.ATTR_ROW}="${row}"]`,
        );
        if (!firstRow || !targetRow) {
            return;
        }
        // When calculating scroll position, we consider anything below the
        // start of the first row to be the "viewport" (i.e. we subtract the
        // height of any header from the viewport).
        const viewportY = firstRow.getBoundingClientRect().top + window.scrollY;
        const targetBounds = targetRow.getBoundingClientRect();
        const isVisible =
            targetBounds.top >= viewportY &&
            targetBounds.bottom <= document.documentElement.clientHeight;
        if (!isVisible) {
            // Place the target row in the middle of the viewport.
            const rowY = targetBounds.top + window.scrollY;
            const viewportHeight = document.documentElement.clientHeight - viewportY;
            const targetScroll =
                rowY - viewportY - (viewportHeight / 2 - targetBounds.height / 2);
            window.scrollTo({ behavior: "smooth", top: targetScroll } );
        }
    }
}

namespace Styles {
    export const self = css({
        height: "100%",
        display: "flex",
        flexDirection: "column",
    });
    export const fillWidth = css({
        width: "100%",
        overflowX: "hidden",
    });
    export const grid = css({
        // The grid-template-columns are set by the header element
        display: "grid",
        flex: "0 0 auto",
    });
    export const fillerBottom = css({
        // We always want _some_ filler at the bottom, so there's an easy way to
        // deselect everything.
        height: "10px",
        flex: "1 0 auto",
    });
}
