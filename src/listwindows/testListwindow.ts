/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { ViewMessage, RenderParameters } from "../../webviews/shared/protocol";
import { ListwindowViewProvider } from "./listwindowViewProvider";

/**
 * Provides a listwindow webview for running tests. It allows rendering your own
 * rendering parameters and then dumping the resulting HTML.
 */
export class TestListwindow implements vscode.Disposable {
    private static readonly VIEW_ID = "iar-test-listwindow";

    private readonly view: ListwindowViewProvider;

    private onHTMLDump: ((html: string) => void) | undefined = undefined;

    /**
     * Creates a new view and registers it.
     */
    constructor(extensionUri: vscode.Uri) {
        this.view = new ListwindowViewProvider(
            extensionUri,
            TestListwindow.VIEW_ID,
        );
        this.view.setEnabled(true);
        this.view.onMessageReceived = (msg) => this.handleMessageFromView(msg);
    }

    dispose() {
        this.view.dispose();
    }

    /**
     * Force focus to this view.
     */
    async focus() {
        await this.view.focus();
    }

    async render(params: RenderParameters) {
        await this.view.postMessageToView({
            subject: "render",
            params,
        });
    }

    dumpHTML(): Promise<string> {
        return new Promise(res => {
            this.onHTMLDump = res;
            this.view.postMessageToView({
                subject: "dumpHTML",
            });
        });
    }

    private handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            case "HTMLDump":
                this.onHTMLDump?.(msg.html);
                break;
        }
    }
}
