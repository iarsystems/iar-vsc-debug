/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { ListwindowViewProvider } from "./listwindowProvider";
import { ViewMessage } from "../../webviews/listwindow/protocol";

/**
 * The "live watch" listwindow.
 */
export class LiveWatchListwindow implements vscode.Disposable {
    private static readonly VIEW_ID = "iar-live-watch";

    private readonly view: ListwindowViewProvider;

    /**
     * Creates a new view and registers it.
     */
    constructor(extensionUri: vscode.Uri) {
        this.view = new ListwindowViewProvider(
            extensionUri,
            LiveWatchListwindow.VIEW_ID,
        );
        this.view.onMessageReceived = (msg) => this.handleMessageFromView(msg);
    }
    private handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            // TODO: contact the backend
        }
    }

    dispose() {
        this.view.dispose();
    }
}