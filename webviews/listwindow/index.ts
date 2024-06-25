/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ExtensionMessage, RenderParameters, ViewMessage } from "./protocol";
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

    appElement.innerHTML = `<p>Loaded!</p>`;

    window.addEventListener("message", event => {
        const message: ExtensionMessage = event.data;
        switch (message.subject) {
            case "render": {
                const grid = new GridElement();
                grid.data = message.params;
                appElement.replaceChildren(grid);
                break;
            }
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
