/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { logger } from "iar-vsc-common/logger";
import { ViewMessage, ExtensionMessage, ColumnResizeMode } from "../../webviews/listwindow/protocol";
import { SettingsConstants } from "../settingsConstants";

/**
 * Instantiates a webview that renders a listwindow, and handles all
 * communication with it.
 * The view uses a message-passing system to e.g. receive what to draw and to
 * notify the extension of the user interacting with it.
 * For documentation on webviews, see here:
 * https://code.visualstudio.com/api/extension-guides/webview
 */
export class ListwindowViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {

    private view?: vscode.WebviewView;
    private viewLoaded: Promise<void> | undefined = undefined;
    private disposables: vscode.Disposable[] = [];

    onMessageReceived: ((message: ViewMessage) => void) | undefined = undefined;

    /**
     * Creates a new view and registers it.
     * @param extensionUri The uri of the extension's root directory
     * @param viewId The id to register the view as. Must match the view id in package.json.
     */
    constructor(private readonly extensionUri: vscode.Uri,
        private readonly viewId: string,
    ) {
        logger.debug(`Registering listwindow '${viewId}'`);
        this.disposables.push(
            vscode.window.registerWebviewViewProvider(viewId, this),
        );
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (
                    e.affectsConfiguration(
                        SettingsConstants.MAIN_SECTION +
                            "." +
                            SettingsConstants.FIT_CONTENT_TO_VIEW,
                    )
                ) {
                    this.applyResizeMode();
                }
            }),
        );
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
                vscode.Uri.joinPath(this.extensionUri, "out/webviews"),
                vscode.Uri.joinPath(this.extensionUri, "node_modules/@vscode/codicons"),
                vscode.Uri.joinPath(this.extensionUri, "images/icons"),
            ]
        };
        let resolveViewLoaded: (() => void) | undefined = undefined;
        this.viewLoaded = new Promise(resolve => resolveViewLoaded = resolve);

        this.view.webview.onDidReceiveMessage(async(message: ViewMessage) => {
            logger.debug(`Message from ${this.viewId}: ${JSON.stringify(message)}`);
            if (message.subject === "loaded") {
                resolveViewLoaded?.();
                await this.applyResizeMode();
            }
            this.onMessageReceived?.(message);
        });
        this.view.webview.html = Rendering.getWebviewContent(
            this.view.webview,
            this.extensionUri,
            this.viewId,
        );
    }

    async show() {
        await vscode.commands.executeCommand(`${this.viewId}.focus`);
    }

    async postMessageToView(msg: ExtensionMessage) {
        await this.viewLoaded;
        if (!this.view) {
            logger.warn(`Tried sending message to view '${this.viewId}' that hasn't been created yet: ${JSON.stringify(msg)}`);
        }
        return this.view?.webview.postMessage(msg);
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }


    private async applyResizeMode() {
        const fitContentWidth = vscode.workspace.
            getConfiguration(SettingsConstants.MAIN_SECTION).
            get<boolean>(SettingsConstants.FIT_CONTENT_TO_VIEW);
        const mode: ColumnResizeMode = fitContentWidth ? "fit" : "fixed";
        await this.postMessageToView({
            subject: "setResizeMode",
            mode,
        });
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
        viewId: string,
    ) {
        // load npm packages for standardized UI components and icons
        //! NOTE: ALL files you load here (even indirectly) must be explicitly included in .vscodeignore, so that they are packaged in the .vsix. Webpack will not find these files.
        // load css and js for the view
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "out", "webviews", "listwindow.js"));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"));

        const nonce = getNonce();

        // install the es6-string-html extension for syntax highlighting here
        return /*html*/`<!DOCTYPE html>
    <html lang="en" style="height: 100%">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource};
                    frame-src ${webview.cspSource};
                    script-src 'nonce-${nonce}';
                    style-src ${webview.cspSource} 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${codiconsUri}">
        <script src="${jsUri}" nonce="${nonce}"></script>
        <title>Listwindow</title>
    </head>
    <body>
        <div id="imageroot" root="${webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "images", "icons"))}">
        </div>
        <div id="toolbar""></div>
        <!-- This is used to identify drag-and-drop operations, must be unique! -->
        <div id="app" viewId="${viewId}">
        </div>

    </body>
    </html>`;
    }
}

function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
