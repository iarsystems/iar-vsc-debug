/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ColumnResizeMode, RenderParameters, Serializable } from "../protocol";
import { HeaderElement } from "./header/header";
import { RowElement } from "./row";
import { HoverService } from "./hoverService";
import { toBigInt } from "./utils";
import { DragDropService } from "./dragDropService";
import { ScrollOperation, SelectionFlags, Target } from "../thrift/listwindow_types";
import { css } from "@emotion/css";
import { SharedStyles } from "./styles/sharedStyles";
import { VirtualList } from "./virtualList";
import { CellEditService } from "./cell/cellEditService";
import { MessageService } from "../messageService";
import { TooltipService } from "./tooltipService";
import { CellElement, CellPosition } from "./cell/cell";
import { ContextMenuService } from "./contextMenuService";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
export class GridRenderer {
    // An outer container which is the actual scrollable element. Besides the
    // grid, this may contain tooltips, context menus, etc.
    private readonly scroller: HTMLElement;
    // The data grid, i.e. the header and cells. Cleared and redrawn on each
    // render.
    private readonly grid: HTMLElement;
    // An transparent overlay used to dim the view when it is frozen.
    private readonly overlay: HTMLElement;

    private readonly listRenderer = new VirtualList();
    private readonly cellEditService: CellEditService;
    private readonly tooltipService: TooltipService;
    private readonly contextMenuService: ContextMenuService;

    constructor(private readonly container: HTMLElement,
        private readonly hoverService: HoverService,
        private readonly dragDropService: DragDropService,
        private readonly messageService: MessageService,
    ) {
        this.scroller = document.createElement("div");
        container.appendChild(this.scroller);
        this.scroller.classList.add(Styles.scroller);
        this.scroller.classList.add(Styles.fillWidth);

        const resizeObserver = new ResizeObserver(() => {
            messageService.sendMessage({
                subject: "viewportChanged",
                rowsInPage: this.listRenderer.getNumVisibleRows() ?? 0,
            });
        });
        resizeObserver.observe(this.scroller);
        this.scroller.addEventListener("wheel", e => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.messageService.sendMessage({
                    subject: "scrollOperationPressed",
                    operation: e.deltaY > 0 ? ScrollOperation.kScrollLineDown : ScrollOperation.kScrollLineUp,
                });
            }
        });

        this.grid = document.createElement("div");
        this.scroller.appendChild(this.grid);
        this.grid.classList.add(Styles.grid);

        this.overlay = document.createElement("div");
        this.overlay.classList.add(Styles.overlay);
        container.appendChild(this.overlay);

        this.cellEditService = new CellEditService(this.scroller, messageService);
        this.container.addEventListener("cell-edit-requested", ev => {
            this.cellEditService.requestCellEdit(ev.detail);
        });
        this.tooltipService = new TooltipService(this.scroller, messageService);
        this.container.addEventListener("cell-hovered", ev => {
            this.tooltipService.requestTooltip(ev);
        });
        this.contextMenuService = new ContextMenuService(this.scroller, messageService);
        this.container.addEventListener("cell-right-clicked", ev => {
            this.contextMenuService.requestContextMenu(ev.detail);
        });
    }

    render(
        params: Serializable<RenderParameters>,
        resizeMode: ColumnResizeMode,
        initialColumnWidths: number[] | undefined,
    ) {
        this.grid.replaceChildren();

        if (resizeMode === "fit") {
            this.grid.classList.add(Styles.fillWidth);
        } else {
            this.grid.classList.remove(Styles.fillWidth);
        }

        if (initialColumnWidths === undefined) {
            initialColumnWidths = params.columnInfo.map(col => col.width);
        }

        this.dragDropService?.registerDropTarget(
            this.grid,
            { col: -1, row: -1n },
            Target.kTargetAll,
        );
        if (
            this.dragDropService?.currentFeedback.target === Target.kTargetAll
        ) {
            this.grid.classList.add(SharedStyles.dropTarget);
        }

        // Create header
        const headerElement = new HeaderElement();
        headerElement.columns = params.columnInfo;
        headerElement.columnWidths = initialColumnWidths;
        headerElement.clickable = params.listSpec.canClickColumns;
        headerElement.resizeMode = resizeMode;
        this.grid.appendChild(headerElement);

        if (!params.listSpec.showHeader) {
            headerElement.style.display = "none";
        }

        // Create body
        const ranges = params.selection.map(range => {
            return {
                first: toBigInt(range.first),
                last: toBigInt(range.last),
            };
        });
        const rows: HTMLElement[] = [];
        for (const [y, row] of params.rows.entries()) {
            const rowElem = new RowElement();
            rowElem.row = row;
            rowElem.columns = params.columnInfo;
            const actualY = BigInt(y) + BigInt(params.offset.value);
            rowElem.index = actualY;
            rowElem.selected = ranges.some(
                range => range.first <= actualY && range.last >= actualY,
            );
            rowElem.frozen = params.frozen;
            rowElem.showCheckBoxes = params.listSpec.showCheckBoxes;
            rowElem.addFillerCell = resizeMode === "fixed";
            rowElem.hoverService = this.hoverService;
            rowElem.dragDropService = this.dragDropService;
            rowElem.messageService = this.messageService;
            rows.push(rowElem);
        }

        {
            const fillerTop = document.createElement("div");
            fillerTop.style.gridColumn = `span ${params.columnInfo.length}`;
            const fillerBottom = document.createElement("div");
            fillerBottom.style.gridColumn = `span ${params.columnInfo.length}`;
            // The bottom filler has a minHeight to ensure there's always some
            // space at the very bottom of the list that can be clicked to
            // deselect everything.
            fillerBottom.classList.add(Styles.fillerBottom);
            this.grid.appendChild(fillerBottom);
            fillerBottom.onclick = () => {
                this.messageService.sendMessage({
                    subject: "cellLeftClicked",
                    col: -1,
                    row: { value: "-1" },
                    flags: SelectionFlags.kReplace,
                });
            };

            this.listRenderer.render({
                container: this.grid,
                items: rows,
                fillerTop,
                fillerBottom,
                itemHeight:
                    CellElement.HEIGHT_PX + (params.listSpec.showGrid ? 1 : 0),
                scrollInfo: params.scrollInfo,
            });
        }

        if (params.frozen) {
            const isLightTheme = params.columnInfo[0]
                ? params.columnInfo[0].defaultFormat.bgColor.r >
                  params.columnInfo[0].defaultFormat.textColor.r
                : false;
            if (isLightTheme) {
                this.overlay.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
            } else {
                this.overlay.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            }
        }
        this.container.oncontextmenu = (ev: MouseEvent) => {
            this.contextMenuService.requestContextMenu({
                col: -1,
                row: -1n,
                clickPosition: ev,
            });
        };
    }

    getNumVisibleRows() {
        return this.listRenderer.getNumVisibleRows();
    }

    requestCellEdit(pos: CellPosition) {
        this.cellEditService.requestCellEdit(pos);
    }
}

namespace Styles {
    export const scroller = css({
        height: "100%",
        overflow: "auto",
        position: "relative",
    });
    export const grid = css({
        // The grid-template-columns are set by the header element
        display: "grid",
        gridAutoRows: "min-content",
    });
    export const fillWidth = css({
        width: "100%",
    });
    export const fillerBottom = css({
        minHeight: "10px",
    });
    export const overlay = css({
        pointerEvents: "none",
        position: "absolute",
        inset: 0,
    });
}
