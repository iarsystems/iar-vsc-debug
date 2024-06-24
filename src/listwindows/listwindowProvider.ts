/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { logger } from "iar-vsc-common/logger";
import { ViewMessage, ExtensionMessage, RenderParameters } from "../../webviews/listwindow/protocol";
import { DragDropFeedback, ListSpec, SelRange } from "iar-vsc-common/thrift/bindings/listwindow_types";

/**
 * Instantiates a webview that renders a listwindow, and handles all
 * communication with it.
 * The view uses a message-passing system to e.g. receive what to draw and to
 * notify the extension of the user interacting with it.
 * For documentation on webviews, see here:
 * https://code.visualstudio.com/api/extension-guides/webview
 */
export class ListwindowViewProvider implements vscode.WebviewViewProvider {

    private view?: vscode.WebviewView;
    private viewLoaded: Promise<void> | undefined = undefined;

    /**
     * Creates a new view. The caller is responsible for registering it.
     * @param extensionUri The uri of the extension's root directory
     */
    constructor(private readonly extensionUri: vscode.Uri,
        private readonly viewId: string,
    ) {

    }

    // Called by vscode before the view is shown
    resolveWebviewView(webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken): void | Thenable<void> {

        this.view = webviewView;
        this.view.onDidDispose(() => {
            this.view = undefined;
        });

        this.view.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, "dist/webviews"),
                vscode.Uri.joinPath(this.extensionUri, "node_modules"),
            ]
        };
        let onViewLoaded: (() => void) | undefined = undefined;
        this.viewLoaded = new Promise(resolve => onViewLoaded = resolve);

        this.view.webview.onDidReceiveMessage((message: ViewMessage) => {
            logger.debug(`Message from ${this.viewId}: ${JSON.stringify(message)}`);

            switch (message.subject) {
                case "loaded":
                    onViewLoaded?.();
                    break;
                case "HTMLDump":
                    // ignore for now, only used for testing
                    break;
                default: {
                    // Checks that all message variants are handled
                    const _exhaustiveCheck: never = message;
                    throw _exhaustiveCheck;
                }
            }
        });
        this.view.webview.html = Rendering.getWebviewContent(
            this.view.webview,
            this.extensionUri
        );
        this.updateView();
    }

    private async updateView() {
        if (this.view === undefined) {
            return;
        }
        await this.viewLoaded;

        const params: RenderParameters = {
            rows: [],
            columnInfo: [],
            dropFeedback: new DragDropFeedback(),
            listSpec: new ListSpec(),
            selectedColumn: -1,
            selection: new SelRange(),
        };

        this.postMessageToView({
            subject: "render",
            params: params,
        });
    }

    private async postMessageToView(msg: ExtensionMessage) {
        await this.viewLoaded;
        return this.view?.webview.postMessage(msg);
    }
}

/**
 * Generates the HTML for the view. This does little other than loading the
 * correct scripts. All rendering logic is done in the view itself.
 */
namespace Rendering {

    export function getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
    ) {
        // load npm packages for standardized UI components and icons
        //! NOTE: ALL files you load here (even indirectly) must be explicitly included in .vscodeignore, so that they are packaged in the .vsix. Webpack will not find these files.
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"));
        // load css and js for the view
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webviews", "listwindow", "styles.css"));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webviews", "listwindow.js"));

        // install the es6-string-html extension for syntax highlighting here
        return /*html*/`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource};
                    frame-src ${webview.cspSource};
                    script-src ${webview.cspSource};
                    style-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <link href="${codiconsUri}" rel="stylesheet" />
        <link rel="stylesheet" href="${cssUri}">
        <script src="${jsUri}"></script>
        <title>Listwindow</title>
    </head>
    <body>
        <div id="app">
            <p>Loading...</p>
        </div>
    </body>
    </html>`;
    }
}
