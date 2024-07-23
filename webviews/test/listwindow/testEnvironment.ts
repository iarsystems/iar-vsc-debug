/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { JSDOM } from "jsdom";
import { ExtensionMessage, ViewMessage, ViewMessageVariant } from "../../listwindow/protocol";
import * as fs from "fs";
import * as path from "path";
import userEvent, { UserEvent } from "@testing-library/user-event";

/**
 * Sets up an emulated listwindow view using JSDOM as the browser environment,
 * and a mock implementaion of the VS Code webview messaging api.
 *
 * This lets you test view using {@link ExtensionMessage}s (e.g. render calls)
 * and DOM events as the input, and the rendered HTML and {@link ViewMessage}s
 * sent by the view as the output to verify.
 */
export async function setupTestEnvironment(): Promise<{
    dom: JSDOM;
    api: MockVSCodeApi;
    user: UserEvent;
}> {
    const dom = new JSDOM(
        /*html*/ `
        <html>
            <body>
                <div id="app" viewId="testView">
                </div>
            </body>
        </html> `,
        { runScripts: "dangerously", pretendToBeVisual: true },
    );
    dom.window.scrollTo = () => {
        /* JSDOM doesn't implement this, so we mock it */
    };
    const user = userEvent.setup({ document: dom.window.document });

    const api = new MockVSCodeApi(dom);

    const listwindowIndex = fs.readFileSync(
        path.join(__dirname, "../../listwindow.js"),
        { encoding: "utf-8" },
    );
    dom.window.eval(listwindowIndex);
    await api.waitForMessage("loaded");

    return { dom, api, user };
}

/**
 * Implements VS Code's message passing webview API for testing purposes:
 * https://code.visualstudio.com/api/extension-guides/webview#passing-messages-from-a-webview-to-an-extension
 */
export class MockVSCodeApi {
    // We inject this into the JSDOM environment to act as the VS Code api
    private static readonly SCRIPT = /*js*/ `
        function acquireVsCodeApi() {
            return {
                getState: function() { return undefined; },
                setState: function() {},
                postMessage: function(msg) { window.msgCallback(msg); },
            };
        }
    `;

    private readonly msgCallbacks: Array<(msg: ViewMessage) => void> = [];

    constructor(private readonly dom: JSDOM) {
        dom.window["msgCallback"] = (msg: ViewMessage) => {
            console.log("<- " + msg.subject);
            this.msgCallbacks.forEach(cb => cb(msg));
        };
        dom.window.eval(MockVSCodeApi.SCRIPT);
    }

    /**
     * Sends a message to the view.
     */
    postMessage(msg: ExtensionMessage) {
        console.log("-> " + msg.subject);
        // Emulate the serialization that the real API does
        const deser = JSON.parse(JSON.stringify(msg));
        this.dom.window.postMessage(deser, "*");
    }

    /**
     * Waits for the view to send a message with the given subject, and throws
     * if no such message is received before the timeout.
     */
    waitForMessage<Subject extends ViewMessage["subject"]>(
        subject: Subject,
        timeoutMs = 500,
    ): Promise<ViewMessageVariant<Subject>> {
        return Promise.race([
            new Promise<ViewMessageVariant<Subject>>(resolve =>
                this.msgCallbacks.push(msg => {
                    if (msg.subject === subject) {
                        resolve(msg as ViewMessageVariant<Subject>);
                    }
                }),
            ),
            new Promise<ViewMessageVariant<Subject>>((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(
                                `Did not receive message '${subject}' within ${timeoutMs} ms`,
                            ),
                        ),
                    timeoutMs,
                ),
            ),
        ]);
    }
}