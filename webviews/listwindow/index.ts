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

const vscode = acquireVsCodeApi<RenderParameters>();

window.addEventListener("load", main);

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
    root.replaceChildren(grid);
}
