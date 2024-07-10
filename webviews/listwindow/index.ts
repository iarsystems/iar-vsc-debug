/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { WebviewApi } from "vscode-webview";
import {
    ColumnResizeMode,
    ExtensionMessage,
    RenderParameters,
} from "./protocol";
import { GridElement } from "./rendering/grid";
import { TooltipService } from "./rendering/tooltipService";
import { PersistedState } from "./state";
import { SelectionFlags } from "./thrift/listwindow_types";
import { HoverService } from "./rendering/hoverService";
import { Theming } from "./rendering/styles/theming";
import { provideVSCodeDesignSystem, vsCodeTextField } from "@vscode/webview-ui-toolkit";
import { CellEditService } from "./rendering/cell/cellEditService";
import { DragDropService } from "./rendering/dragDropService";
import { ContextMenuService } from "./rendering/contextMenuService";
import { MessageService } from "./messageService";

provideVSCodeDesignSystem().register(vsCodeTextField());

/**
 * The main class, which orchestrates rendering and is where we handle most
 * input events.
 */
class ListwindowController {
    private readonly persistedState: PersistedState;
    private renderParams: RenderParameters | undefined = undefined;
    private resizeMode: ColumnResizeMode = "fixed";
    private readonly messageService: MessageService;
    private readonly tooltipService: TooltipService;
    private readonly hoverService = new HoverService();
    private readonly contextMenuService;
    private readonly cellEditService: CellEditService;
    private readonly dragDropService: DragDropService;

    constructor(
        private readonly appElement: HTMLElement,
        vscode: WebviewApi<PersistedState.Data>,
    ) {
        this.persistedState = new PersistedState(vscode);
        this.messageService = new MessageService(vscode);
        this.tooltipService = new TooltipService(this.messageService);
        this.cellEditService = new CellEditService(this.messageService);
        this.contextMenuService = new ContextMenuService(
            this.appElement,
            this.messageService,
        );

        const viewId = appElement.getAttribute("viewId") ?? "unknown";
        this.dragDropService = new DragDropService(viewId, this.messageService);
        this.dragDropService.onFeedbackChanged = () => this.render();

        Theming.initialize();
        Theming.setViewHasFocus(document.hasFocus());
        window.addEventListener("focus", () => Theming.setViewHasFocus(true));
        window.addEventListener("blur", () => Theming.setViewHasFocus(false));

        this.messageService.addMessageHandler(msg => this.handleMessage(msg));
        this.messageService.sendMessage({ subject: "loaded" });
    }

    /** Handle a message from the view provider in the extension code */
    private handleMessage(msg: ExtensionMessage) {
        switch (msg.subject) {
            case "render": {
                this.renderParams = msg.params;
                this.render();
                break;
            }
            case "setResizeMode":
                this.resizeMode = msg.mode;
                if (this.renderParams) {
                    this.render();
                }
                break;
            case "dumpHTML":
                this.messageService.sendMessage({
                    subject: "HTMLDump",
                    html: this.appElement.outerHTML,
                });
                break;
        }
    }

    private render() {
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Replace all contents of the appElement
        const grid = new GridElement();
        grid.data = this.renderParams;
        grid.resizeMode = this.resizeMode;
        if (this.persistedState.columnWidths) {
            grid.initialColumnWidths = this.persistedState.columnWidths;
        }
        grid.hoverService = this.hoverService;
        grid.dragDropService = this.dragDropService;

        this.appElement.replaceChildren(grid);

        // Attach event listeners to the new elements
        grid.addEventListener("columns-resized", ev => {
            this.persistedState.columnWidths = ev.detail.newColumnWidths;
        });

        grid.addEventListener("cell-clicked", ev => {
            if (ev.detail.isDoubleClick) {
                this.messageService.sendMessage({
                    subject: "cellDoubleClicked",
                    col: ev.detail.col,
                    row: ev.detail.row,
                });
            } else {
                let flags = SelectionFlags.kReplace;
                if (ev.detail.ctrlPressed) {
                    flags = SelectionFlags.kAdd;
                } else if (ev.detail.shiftPressed) {
                    flags = SelectionFlags.kRange;
                }
                this.messageService.sendMessage({
                    subject: "cellLeftClicked",
                    col: ev.detail.col,
                    row: ev.detail.row,
                    flags,
                });
            }
        });
        grid.addEventListener("cell-right-clicked", ev => {
            this.contextMenuService.requestContextMenu(ev);
        });
        grid.addEventListener("cell-hovered", ev => {
            this.tooltipService.requestTooltip(ev);
        });
        grid.addEventListener("row-expansion-toggled", ev => {
            this.messageService.sendMessage({
                subject: "rowExpansionToggled",
                row: ev.detail.row,
            });
        });
        grid.addEventListener("cell-edit-requested", ev => {
            this.cellEditService.requestCellEdit(ev);
        });

        Theming.setGridLinesVisible(!!this.renderParams?.listSpec.showGrid);

        window.scrollTo(scrollX, scrollY);
    }
}


window.addEventListener("load", () => {
    document.addEventListener("contextmenu", ev => {
        // Never allow VS Code to open its own context menu
        ev.preventDefault();
    });

    const appElement = document.getElementById("app");
    if (!appElement) {
        return;
    }
    const vscode = acquireVsCodeApi<PersistedState.Data>();

    new ListwindowController(appElement, vscode);
});
