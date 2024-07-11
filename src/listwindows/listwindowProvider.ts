/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { logger } from "iar-vsc-common/logger";
import { ViewMessage, ExtensionMessage, RenderParameters, ColumnResizeMode } from "../../webviews/listwindow/protocol";
import { Alignment, Cell, Column, DragDropFeedback, Format, ListSpec, Row, SelRange, Target, TextStyle } from "iar-vsc-common/thrift/bindings/listwindow_types";
import Int64 = require("node-int64");
import { SettingsConstants } from "../settingsConstants";
import { MenuItem } from "../../webviews/listwindow/thrift/listwindow_types";

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
    private onViewLoaded: (() => void) | undefined = undefined;

    /**
     * Creates a new view. The caller is responsible for registering it.
     * @param extensionUri The uri of the extension's root directory
     */
    constructor(private readonly extensionUri: vscode.Uri,
        private readonly viewId: string,
    ) {
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
        });
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
                vscode.Uri.joinPath(this.extensionUri, "node_modules/@vscode/codicons"),
            ]
        };
        this.viewLoaded = new Promise(resolve => this.onViewLoaded = resolve);

        this.view.webview.onDidReceiveMessage((message: ViewMessage) => {
            logger.debug(`Message from ${this.viewId}: ${JSON.stringify(message)}`);
            this.handleMessageFromView(message);

        });
        this.view.webview.html = Rendering.getWebviewContent(
            this.view.webview,
            this.extensionUri,
            this.viewId,
        );

        this.view.onDidChangeVisibility(() => {
            // Webview state is destroyed when the view is made invisible, so we
            // need to resend the latest state when it becomes visible again
            if (this.view?.visible) {
                this.applyResizeMode().then(() => this.updateView());
            }
        });

        this.applyResizeMode().then(() => this.updateView());
    }

    private async updateView() {
        if (this.view === undefined) {
            return;
        }
        await this.viewLoaded;

        this.postMessageToView({
            subject: "render",
            params: getMockRenderParams(),
        });
    }

    private async postMessageToView(msg: ExtensionMessage) {
        await this.viewLoaded;
        return this.view?.webview.postMessage(msg);
    }

    private handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            case "loaded":
                this.onViewLoaded?.();
                break;
            case "HTMLDump":
                // ignore for now, only used for testing
                break;
            case "cellLeftClicked":
                // TODO: send this to the backend
                // for now we fake the backend
                this.postMessageToView({
                    subject: "render",
                    params: getMockRenderParams(msg.row),
                });
                break;
            case "cellDoubleClicked":
                // TODO: send this to the backend
                break;
            case "getContextMenu":
                // TODO: request the menu from the backend
                // for now we fake the backend
                this.postMessageToView({
                    subject: "contextMenuReply",
                    menu: [
                        new MenuItem({
                            text: "Remove",
                            command: 1,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Live Watch",
                            command: 2,
                            enabled: true,
                            checked: true,
                        }),
                        new MenuItem({
                            text: "",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Default Format",
                            command: -1,
                            enabled: false,
                            checked: true,
                        }),
                        new MenuItem({
                            text: "Binary Format",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: ">Show As...",
                            command: 0,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "As Is",
                            command: 3,
                            enabled: true,
                            checked: true,
                        }),
                        new MenuItem({
                            text: "float",
                            command: 4,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: ">Other...",
                            command: 0,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Pointer",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "<",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "<",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: ">Disabled submenu",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Submenu item",
                            command: 5,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "<",
                            command: 6,
                            enabled: true,
                            checked: false,
                        }),
                    ],
                });
                break;
            case "contextItemClicked":
                // TODO: send this to the backend
                break;
            case "getTooltip":
                {
                    // TODO: request the tooltip from the backend
                    // for now we fake the backend
                    const text = msg.col !== 2 ? `BASEPRI_MAX
    ReadWrite
    bits [15:8]
    Base priority mask raise
    Right-click for more registers and options` : undefined;
                    this.postMessageToView({
                        subject: "tooltipReply",
                        text,
                    });
                }
                break;
            case "rowExpansionToggled":
                // TODO: do something
                break;
            case "moreLessToggled":
                // TODO: do something
                break;
            case "getEditableString":
                // TODO: request the string from the backend
                // for now we fake the backend
                this.postMessageToView({
                    subject: "editableStringReply",
                    text: "Hello Edit",
                    col: msg.col,
                    row: msg.row,
                });
                break;
            case "cellEdited":
                // TODO: do something
                break;
            case "localDrop":
                // TODO: do something
                break;
            case "externalDrop":
                // TODO: do something
                break;
            default: {
                // Makes TS check that all message variants are handled
                const _exhaustiveCheck: never = msg;
                throw new Error(
                    "Unhandled message: " +
                        JSON.stringify(_exhaustiveCheck),
                );
            }
        }
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
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webviews", "listwindow", "styles.css"));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webviews", "listwindow.js"));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"));

        const nonce = getNonce();

        // install the es6-string-html extension for syntax highlighting here
        return /*html*/`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource};
                    frame-src ${webview.cspSource};
                    script-src ${webview.cspSource} 'nonce-${nonce}';
                    style-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${cssUri}">
        <link rel="stylesheet" href="${codiconsUri}">
        <script src="${jsUri}" nonce="${nonce}"></script>
        <title>Listwindow</title>
    </head>
    <body>
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

function getMockRenderParams(selectedRow = 1) {
    const format = new Format();
    format.align = Alignment.kLeft;
    format.style = TextStyle.kProportionalPlain;
    const editableFormat = new Format();
    editableFormat.align = Alignment.kLeft;
    editableFormat.style = TextStyle.kProportionalPlain;
    editableFormat.editable = true;
    const memFormat = new Format();
    memFormat.align = Alignment.kRight;
    memFormat.style = TextStyle.kFixedPlain;

    const params: RenderParameters = {
        rows: [
            new Row({
                cells: [
                    new Cell({
                        text: "Fib",
                        format: editableFormat,
                        drop: Target.kTargetRow,
                    }),
                    new Cell({
                        text: "<array>",
                        format,
                        drop: Target.kTargetRow,
                    }),
                    new Cell({
                        text: "0x2000'0030",
                        format: memFormat,
                        drop: Target.kTargetRow,
                    }),
                    new Cell({
                        text: "uint32_t[10]",
                        format,
                        drop: Target.kTargetRow,
                    }),
                ],
                isChecked: false,
                treeinfo: "-",
            }),
        ],
        columnInfo: [
            new Column({
                title: "Expression",
                width: 100,
                fixed: false,
                hideSelection: false,
                defaultFormat: editableFormat,
            }),
            new Column({
                title: "Value",
                width: 150,
                fixed: false,
                hideSelection: false,
                defaultFormat: editableFormat,
            }),
            new Column({
                title: "Location",
                width: 100,
                fixed: false,
                hideSelection: false,
                defaultFormat: memFormat,
            }),
            new Column({
                title: "Type",
                width: 150,
                fixed: false,
                hideSelection: false,
                defaultFormat: format,
            }),
        ],
        dropFeedback: new DragDropFeedback(),
        listSpec: new ListSpec(),
        selectedColumn: -1,
        selection: new SelRange(),
    };
    params.listSpec.showHeader = true;
    params.listSpec.showGrid = true;
    params.listSpec.canClickColumns = true;
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params.rows.push(new Row({
            cells: [
                new Cell({ text: `[${i}]`, format, drop: Target.kTargetRow}),
                new Cell({ text: String(i), format: editableFormat, drop: Target.kTargetRow}),
                new Cell({ text: "0x2000'0030", format: memFormat, drop: Target.kTargetRow}),
                new Cell({ text: "uint32_t", format, drop: Target.kTargetColumn}),
            ],
            isChecked: false,
            treeinfo: "T.",
        }));
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.rows[4]!.treeinfo = "^.";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.rows[params.rows.length - 1]!.treeinfo = "v+";
    params.rows.push(
        new Row({
            cells: [
                new Cell({
                    text: "<click to add>",
                    format: editableFormat,
                    drop: Target.kTargetCell,
                }),
                new Cell({
                    text: "",
                    format,
                    drop: Target.kTargetRow,
                }),
                new Cell({
                    text: "",
                    format,
                    drop: Target.kTargetRow,
                }),
                new Cell({
                    text: "",
                    format,
                    drop: Target.kNoTarget,
                }),
            ],
            isChecked: false,
            treeinfo: "."
        }),
    );
    params.selection.first = new Int64(selectedRow);
    params.selection.last = new Int64(selectedRow);
    return params;
}
