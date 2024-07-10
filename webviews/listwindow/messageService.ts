/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { WebviewApi } from "vscode-webview";
import { ExtensionMessage, ViewMessage } from "./protocol";

type MessageHandler = (msg: ExtensionMessage) => void;

export class MessageService {
    private readonly messageHandlers: MessageHandler[] = [];

    constructor(private readonly api: WebviewApi<unknown>) {
        window.addEventListener("message", ev => {
            if ("subject" in ev.data) {
                const message = ev.data as ExtensionMessage;
                for (const handler of this.messageHandlers) {
                    handler(message);
                }
            }
        });
    }

    addMessageHandler(handler: MessageHandler) {
        this.messageHandlers.push(handler);
    }

    /** Posts a message to the view provider in the extension code */
    sendMessage(msg: ViewMessage) {
        this.api.postMessage(msg);
    }
}
