/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    ColumnResizeMode,
    ExtensionMessage,
    RenderParameters,
    ViewMessage,
} from "./protocol";
import { GridElement } from "./rendering/grid";
import { PersistedState } from "./state";
import { SelectionFlags } from "./thrift/listwindow_types";

const vscode = acquireVsCodeApi<PersistedState>();

window.addEventListener("load", main);

const persistedState = vscode.getState() ?? {};

function postMessage(msg: ViewMessage) {
    vscode.postMessage(msg);
}

function main() {
    const appElement = document.getElementById("app");
    if (!appElement) {
        return;
    }

    let resizeMode: ColumnResizeMode = "fixed";
    let lastRenderParams: RenderParameters | undefined = undefined;

    window.addEventListener("message", event => {
        const message: ExtensionMessage = event.data;
        switch (message.subject) {
            case "render": {
                lastRenderParams = message.params;
                render(appElement, message.params, resizeMode);
                break;
            }
            case "setResizeMode":
                resizeMode = message.mode;
                if (lastRenderParams) {
                    render(appElement, lastRenderParams, resizeMode);
                }
                break;
            case "dumpHTML":
                postMessage({
                    subject: "HTMLDump",
                    html: appElement.outerHTML,
                });
                break;
            case "contextMenuReply":
                // Not supported yet
                break;
            default: {
                // Checks that all message variants are handled
                const _exhaustiveCheck: never = message;
                throw _exhaustiveCheck;
            }
        }
    });
    postMessage({ subject: "loaded" });
}

function render(
    root: HTMLElement,
    params: RenderParameters,
    resizeMode: ColumnResizeMode,
) {
    const grid = new GridElement();
    grid.data = params;
    grid.resizeMode = resizeMode;
    if (persistedState.columnWidths) {
        grid.initialColumnWidths = persistedState.columnWidths;
    }

    attachEventListeners(grid);
    root.replaceChildren(grid);

    document.addEventListener("contextmenu", ev => {
        // Never allow VS Code to open its own context menu
        ev.stopPropagation();
    });
}

/**
 * Attach listeners for user interaction. We handle most user input here, where
 * we have access to the vscode api object.
 */
function attachEventListeners(grid: GridElement) {
    grid.addEventListener("columns-resized", ev => {
        persistedState.columnWidths = ev.detail.newColumnWidths;
        vscode.setState(persistedState);
    });

    grid.addEventListener("cell-clicked", ev => {
        if (ev.detail.isDoubleClick) {
            postMessage({
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
            postMessage({
                subject: "cellLeftClicked",
                col: ev.detail.col,
                row: ev.detail.row,
                flags,
            });
        }
    });
    grid.addEventListener("cell-right-clicked", ev => {
        postMessage({
            subject: "getContextMenu",
            col: ev.detail.col,
            row: ev.detail.row,
        });
    });
}
