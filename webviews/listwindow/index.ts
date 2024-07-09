/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { WebviewApi } from "vscode-webview";
import {
    ColumnResizeMode,
    ExtensionMessage,
    RenderParameters,
    ViewMessage,
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

provideVSCodeDesignSystem().register(vsCodeTextField());

/**
 * The main class, which orchestrates rendering and is the final destination
 * of most input events.
 */
class ListwindowController {
    private readonly persistedState: PersistedState;
    private renderParams: RenderParameters | undefined = undefined;
    private resizeMode: ColumnResizeMode = "fixed";
    private readonly tooltipProvider = new TooltipService();
    private readonly hoverService = new HoverService();
    private readonly cellEditService = new CellEditService();
    private readonly dragDropService: DragDropService;

    constructor(
        private readonly appElement: HTMLElement,
        private readonly vscode: WebviewApi<PersistedState.Data>,
    ) {
        this.persistedState = new PersistedState(vscode);

        Theming.initialize();
        Theming.setViewHasFocus(document.hasFocus());
        window.addEventListener("focus", () => Theming.setViewHasFocus(true));
        window.addEventListener("blur", () => Theming.setViewHasFocus(false));

        this.cellEditService.onCellEditSubmitted = (position, newValue) => {
            this.sendMessage({ subject: "cellEdited", ...position, newValue });
        };

        const viewId = appElement.getAttribute("viewId") ?? "unknown";
        this.dragDropService = new DragDropService(viewId);
        this.dragDropService.onLocalDrop = (destination, origin) => {
            this.sendMessage({
                subject: "localDrop",
                srcCol: origin.col,
                srcRow: origin.row,
                dstCol: destination.col,
                dstRow: destination.row,
            });
        };
        this.dragDropService.onExternalDrop = (destination, text) => {
            this.sendMessage({
                subject: "externalDrop",
                col: destination.col,
                row: destination.row,
                droppedText: text,
            });
        };
        this.dragDropService.onFeedbackChanged = () => this.render();

        this.sendMessage({ subject: "loaded" });
    }

    /** Handle a message from the view provider in the extension code */
    handleMessage(msg: ExtensionMessage) {
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
                this.sendMessage({
                    subject: "HTMLDump",
                    html: this.appElement.outerHTML,
                });
                break;
            case "contextMenuReply":
                // Not supported yet
                break;
            case "tooltipReply":
                this.tooltipProvider.setTextForPendingTooltip(msg.text);
                break;
            case "editableStringReply":
                this.cellEditService.setEditableStringForPendingEdit(msg.text, {
                    col: msg.col,
                    row: msg.row,
                });
                break;
            default: {
                // Makes TS check that all message variants are handled
                const _exhaustiveCheck: never = msg;
                throw new Error(
                    "Unhandled message: " + JSON.stringify(_exhaustiveCheck),
                );
            }
        }
    }

    /** Posts a message to the view provider in the extension code */
    private sendMessage(msg: ViewMessage) {
        this.vscode.postMessage(msg);
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
                this.sendMessage({
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
                this.sendMessage({
                    subject: "cellLeftClicked",
                    col: ev.detail.col,
                    row: ev.detail.row,
                    flags,
                });
            }
        });
        grid.addEventListener("cell-right-clicked", ev => {
            this.sendMessage({
                subject: "getContextMenu",
                col: ev.detail.col,
                row: ev.detail.row,
            });
        });
        grid.addEventListener("cell-hovered", ev => {
            this.tooltipProvider.setPendingTooltip(ev);
            this.sendMessage({
                subject: "getTooltip",
                col: ev.detail.col,
                row: ev.detail.row,
            });
        });
        grid.addEventListener("row-expansion-toggled", ev => {
            this.sendMessage({
                subject: "rowExpansionToggled",
                row: ev.detail.row,
            });
        });
        grid.addEventListener("cell-edit-requested", ev => {
            this.cellEditService.setPendingCellInput(ev);
            this.sendMessage({
                subject: "getEditableString",
                col: ev.detail.col,
                row: ev.detail.row,
            });
        });

        Theming.setGridLinesVisible(!!this.renderParams?.listSpec.showGrid);

        window.scrollTo(scrollX, scrollY);
    }
}

window.addEventListener("load", () => {
    document.addEventListener("contextmenu", ev => {
        // Never allow VS Code to open its own context menu
        ev.stopPropagation();
    });

    const appElement = document.getElementById("app");
    if (!appElement) {
        return;
    }
    const vscode = acquireVsCodeApi<PersistedState.Data>();

    const controller = new ListwindowController(appElement, vscode);

    window.addEventListener("message", ev => {
        if ("subject" in ev.data) {
            const message = ev.data as ExtensionMessage;
            controller.handleMessage(message);
        }
    });
});
