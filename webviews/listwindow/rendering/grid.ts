/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ColumnResizeMode, RenderParameters, Serializable } from "../protocol";
import { HeaderElement } from "./header/header";
import { RowElement } from "./row";
import { HoverService } from "./hoverService";
import { toBigInt } from "./utils";
import { DragDropService } from "./dragDropService";
import { SelectionFlags, Target } from "../thrift/listwindow_types";
import { css } from "@emotion/css";
import { SharedStyles } from "./styles/sharedStyles";
import { ScrollbarElement } from "./scrollbar";
import { CellEditService } from "./cell/cellEditService";
import { MessageService } from "../messageService";
import { TooltipService } from "./tooltipService";
import { CellElement, CellPosition } from "./cell/cell";
import { ContextMenuService } from "./contextMenuService";
import { ScrollOperation } from "../thrift/listwindow_types";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
export class GridRenderer {
    // The data grid, i.e. the header and cells. Cleared and redrawn on each
    // render.
    private readonly grid: HTMLElement;
    // A custom vertical scrollbar.
    private readonly scrollbar: ScrollbarElement;
    // A transparent overlay used to dim the view when it is frozen.
    private readonly overlay: HTMLElement;

    private lastRender: { params: RenderParameters; header: HeaderElement } | undefined = undefined;

    private readonly cellEditService: CellEditService;
    private readonly tooltipService: TooltipService;
    private readonly contextMenuService: ContextMenuService;

    constructor(
        private readonly container: HTMLElement,
        private readonly hoverService: HoverService,
        private readonly dragDropService: DragDropService,
        private readonly messageService: MessageService,
    ) {
        this.container.classList.add(Styles.container);
        this.container.classList.add(Styles.fillWidth);

        const resizeObserver = new ResizeObserver(() => {
            if (!this.lastRender) {
                return;
            }
            messageService.sendMessage({
                subject: "viewportChanged",
                rowsInPage: this.getNumVisibleRows(),
            });
        });
        resizeObserver.observe(this.container);

        this.grid = document.createElement("div");
        this.container.appendChild(this.grid);
        this.grid.classList.add(Styles.grid);
        this.grid.addEventListener("wheel", e => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.messageService.sendMessage({
                    subject: "scrollOperationPressed",
                    operation:
                        e.deltaY > 0
                            ? ScrollOperation.kScrollLineDown
                            : ScrollOperation.kScrollLineUp,
                });
            }
        });

        this.grid.onclick = ev => {
            if (ev.target !== this.grid) {
                return;
            }
            this.messageService.sendMessage({
                subject: "cellClicked",
                col: -1,
                row: { value: "-1" },
                flags: SelectionFlags.kReplace,
            });
        };
        this.dragDropService?.registerDropTarget(
            this.grid,
            { col: -1, row: -1n },
            Target.kTargetAll,
        );

        this.scrollbar = new ScrollbarElement();
        this.scrollbar.messageService = messageService;
        this.scrollbar.style.display = "none";
        this.container.appendChild(this.scrollbar);

        this.overlay = document.createElement("div");
        this.overlay.classList.add(Styles.overlay);
        container.appendChild(this.overlay);

        this.cellEditService = new CellEditService(
            this.container,
            messageService,
        );
        this.container.addEventListener("cell-edit-requested", ev => {
            this.cellEditService.requestCellEdit(ev.detail);
        });
        this.tooltipService = new TooltipService(
            this.container,
            messageService,
        );
        this.container.addEventListener("cell-hovered", ev => {
            this.tooltipService.requestTooltip(ev);
        });
        this.contextMenuService = new ContextMenuService(
            this.container,
            messageService,
        );
        this.container.addEventListener("cell-right-clicked", ev => {
            this.contextMenuService.requestContextMenu(ev.detail);
        });
        this.container.addEventListener("contextmenu", (ev: MouseEvent) => {
            // Both EW and eclipse do a 'click' on right click, so let's do the same
            this.messageService.sendMessage({
                subject: "cellClicked",
                col: -1,
                row: { value: "-1" },
                flags: SelectionFlags.kReplace,
            });
            this.contextMenuService.requestContextMenu({
                col: -1,
                row: -1n,
                clickPosition: ev,
            });
        });
    }

    render(
        params: Serializable<RenderParameters>,
        resizeMode: ColumnResizeMode,
        initialColumnWidths: number[] | undefined,
    ) {
        this.grid.replaceChildren();
        if (params.offset.value !== this.lastRender?.params.offset.value) {
            this.cellEditService.clearActiveEdit();
        }

        if (resizeMode === "fit") {
            this.grid.classList.add(Styles.fillWidth);
        } else {
            this.grid.classList.remove(Styles.fillWidth);
        }

        if (initialColumnWidths === undefined) {
            initialColumnWidths = params.columnInfo.map(col => col.width);
        }

        if (
            this.dragDropService?.currentFeedback.target === Target.kTargetAll
        ) {
            this.container.classList.add(SharedStyles.dropTarget);
        } else {
            this.container.classList.remove(SharedStyles.dropTarget);
        }

        // Create header
        const headerElement = new HeaderElement();
        headerElement.columns = params.columnInfo;
        headerElement.columnWidths = initialColumnWidths;
        headerElement.clickable = params.listSpec.canClickColumns;
        headerElement.resizeMode = resizeMode;
        headerElement.messageService = this.messageService;
        this.grid.appendChild(headerElement);

        if (!params.listSpec.showHeader) {
            headerElement.style.display = "none";
        }
        this.lastRender = { params, header: headerElement };

        // Create body
        const ranges = params.selection.map(range => {
            return {
                first: toBigInt(range.first),
                last: toBigInt(range.last),
            };
        });
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
            this.grid.appendChild(rowElem);
        }

        this.scrollbar.setSizeAndProgress(
            params.scrollInfo.fractionBefore,
            params.scrollInfo.fractionInWin,
        );
        if (params.scrollInfo.fractionInWin >= 1) {
            this.scrollbar.style.display = "none";
        } else {
            this.scrollbar.style.removeProperty("display");
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
        } else {
            this.overlay.style.backgroundColor = "transparent";
        }

        this.messageService.sendMessage({
            subject: "viewportChanged",
            rowsInPage: this.getNumVisibleRows(),
        });
    }

    getNumVisibleRows() {
        // note: this might not be completely accurate before the first render
        // (since we don't know e.g. whether there is a header and/or grid).

        const headerHeight = this.lastRender?.header.getHeight() ?? 0;
        const availableHeight = this.container.clientHeight - headerHeight;
        const rowHeight =
            CellElement.HEIGHT_PX +
            (this.lastRender?.params.listSpec.showGrid ? 1 : 0);

        return availableHeight / rowHeight;
    }

    requestCellEdit(pos: CellPosition) {
        this.cellEditService.requestCellEdit(pos);
    }
}

namespace Styles {
    export const container = css({
        height: "100%",
        position: "relative",
        display: "flex",
    });
    export const grid = css({
        height: "100%",
        overflowY: "hidden",
        flexGrow: 1,
        // The grid-template-columns are set by the header element
        display: "grid",
        gridAutoRows: "min-content",
    });
    export const scrollbar = css({
        flexGrow: 0,
    });
    export const fillWidth = css({
        width: "100%",
        overflowX: "hidden",
    });
    export const overlay = css({
        pointerEvents: "none",
        position: "absolute",
        inset: 0,
    });
}
