/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ColumnResizeMode, RenderParameters } from "../protocol";
import { HeaderElement } from "./header/header";
import { RowElement } from "./row";
import { HoverService } from "./hoverService";
import { createCustomEvent } from "../events";
import { customElement } from "./utils";
import { createCss } from "./styles/createCss";
import { SharedStyles } from "./styles/sharedStyles";
import { CellElement } from "./cell/cell";
import { DragDropService } from "./dragDropService";
import { Target } from "../thrift/listwindow_types";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
@customElement("listwindow-grid")
export class GridElement extends HTMLElement {
    private static readonly STYLES: CSSStyleSheet[] = [
        createCss({
            ":host": {
                height: "100%",
                display: "block",
            },
            "#backdrop": {
                width: "100%",
                height: "100%",
                // Always add some space below the table that we can press to
                // deselect everything
            },
            "#backdrop.drop-target": {
                background: "var(--vscode-list-dropBackground)",
            },
            "#grid": {
                // The grid-template-columns are set by the header element
                display: "grid",
                "padding-bottom": "10px",
            },
        }),
        HeaderElement.STYLES,
        RowElement.STYLES,
        CellElement.OUTER_STYLES,
        ...SharedStyles.STYLES,
    ];
    // Styles to apply if resizeMode is "fit"
    private static readonly STYLE_RESIZEMODE_FIT = createCss({
        ":host": {
            width: "100%",
        },
    });

    data?: RenderParameters = undefined;
    initialColumnWidths: number[] | undefined = undefined;
    resizeMode: ColumnResizeMode = "fixed";

    hoverService: HoverService | undefined = undefined;
    dragDropService: DragDropService | undefined = undefined;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });
        shadow.adoptedStyleSheets.push(...GridElement.STYLES);

        shadow.adoptedStyleSheets.push(GridElement.STYLE_RESIZEMODE_FIT);
        GridElement.STYLE_RESIZEMODE_FIT.disabled = this.resizeMode !== "fit";

        if (!this.data) {
            // TODO: render some placeholder
            return;
        }

        if (this.initialColumnWidths === undefined) {
            this.initialColumnWidths = this.data.columnInfo.map(col => col.width);
        }

        const backdrop = document.createElement("div");
        backdrop.id = "backdrop";
        this.dragDropService?.registerDropTarget(
            backdrop,
            { col: -1, row: -1 },
            Target.kTargetAll,
        );
        if (this.dragDropService?.currentFeedback.target === Target.kTargetAll) {
            backdrop.classList.add("drop-target");
        }
        shadow.appendChild(backdrop);

        const grid = document.createElement("div");
        grid.id = "grid";
        backdrop.appendChild(grid);

        backdrop.onclick = (ev: MouseEvent) => {
            // Any click that is not on a cell/header will be on the backdrop
            // or the grid's padding
            if (ev.target === backdrop || ev.target === grid) {
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
                        composed: true,
                    }),
                );
            }
        };

        // Create header
        if (this.data.listSpec.showHeader) {
            const header = new HeaderElement();
            header.columns = this.data.columnInfo;
            header.columnWidths = this.initialColumnWidths;
            header.clickable = this.data.listSpec.canClickColumns;
            header.resizeMode = this.resizeMode;

            grid.appendChild(header);
        }

        // Create body
        for (const [y, row] of this.data.rows.entries()) {
            const rowElem = new RowElement();
            rowElem.row = row;
            rowElem.index = y;
            // TODO: fix
            rowElem.selected =
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.data.selection.first.buffer.data[7]! <= y &&
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.data.selection.last.buffer.data[7]! >= y;
            rowElem.hoverService = this.hoverService;
            rowElem.dragDropService = this.dragDropService;
            grid.appendChild(rowElem);
        }
    }

    override oncontextmenu = (ev: MouseEvent) => {
        this.dispatchEvent(createCustomEvent("cell-right-clicked", {
            detail: {
                col: -1,
                row: -1,
                clickPosition: ev,
            },
            bubbles: true,
            composed: true,
        }));
    };

    ensureRowVisible(row: number) {
        if (row < 0) {
            return;
        }

        const firstRow = this.shadowRoot?.querySelector(
            `[${CellElement.ATTR_ROW}="0"]`,
        );
        const targetRow = this.shadowRoot?.querySelector(
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
