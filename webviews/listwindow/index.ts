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

/**
 * The main class, which orchestrates rendering, input handling etc.
 */
class ListwindowController {
    private readonly persistedState: PersistedState;
    private renderParams: RenderParameters | undefined = undefined;
    private resizeMode: ColumnResizeMode = "fixed";
    private readonly tooltipProvider = new TooltipService();
    private readonly hoverService = new HoverService();

    constructor(
        private readonly appElement: HTMLElement,
        private readonly vscode: WebviewApi<PersistedState.Data>,
    ) {
        this.persistedState = new PersistedState(vscode);
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
        // Replace all contents of the appElement
        const grid = new GridElement();
        grid.data = this.renderParams;
        grid.resizeMode = this.resizeMode;
        if (this.persistedState.columnWidths) {
            grid.initialColumnWidths = this.persistedState.columnWidths;
        }
        grid.hoverService = this.hoverService;

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
