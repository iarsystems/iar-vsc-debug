/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { logger } from "iar-vsc-common/logger";
import {
    ViewMessage,
    ExtensionMessage,
} from "../../webviews/shared/protocol";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import {
    GenericDialogResults,
    GenericDialogReturnType,
} from "iar-vsc-common/thrift/bindings/frontend_types";
import { unpackTree } from "../utils";
import * as Q from "q";
import { FormViewBackend, GenericFormViewBackend } from "./dialogsClient";
import { CustomEvent, CustomRequest } from "../dap/customRequest";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";

/**
 * A user form, which allows us to ask the user for infromation
 * based on a description. The form will automatically close
 * if it loses focus, is closed or becomes hidden. When
 * automatically closed, all information is discarded.
 */
export class UserForm {
    private viewLoaded: Promise<void> | undefined = undefined;
    private ids: string[] = [];

    private formResolver: ((arg: GenericDialogResults) => void) | undefined =
        undefined;

    private panel?: vscode.WebviewPanel;

    constructor(
        public readonly id: string,
        private readonly title: string,
        private readonly form: PropertyTreeItem,
        private readonly extensionUri: vscode.Uri,
        private readonly formBackend: FormViewBackend | undefined = undefined,
    ) {}

    public async showForm(): Promise<GenericDialogResults> {
        this.createPanel();
        this.setupConnection();

        if (this.formResolver) {
            // Already running the form, just cancel with unknown.
            return Q.resolve(
                new GenericDialogResults({
                    type: GenericDialogReturnType.kUnknown,
                    items: new PropertyTreeItem({
                        key: "",
                        value: "",
                        children: [],
                    }),
                }),
            );
        }
        this.formResolver = undefined;
        const formComplete = new Promise<GenericDialogResults>(
            resolve => (this.formResolver = resolve),
        );
        await this.viewLoaded;
        const results = await formComplete;
        return results;
    }

    private createPanel() {
        this.panel = vscode.window.createWebviewPanel(
            this.id,
            this.title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, "out/webviews"),
                    vscode.Uri.joinPath(
                        this.extensionUri,
                        "node_modules/@vscode/codicons",
                    ),
                    vscode.Uri.joinPath(this.extensionUri, "images/icons"),
                ],
            },
        );

        let resolveViewLoaded: (() => void) | undefined = undefined;
        this.viewLoaded = new Promise(resolve => (resolveViewLoaded = resolve));

        this.panel.webview.onDidReceiveMessage(async(message: ViewMessage) => {
            logger.debug(`Message from ${this.id}: ${JSON.stringify(message)}`);
            if (message.subject === "loaded") {
                // As soon as the view is loaded, populate it with
                // info. This also allows the user to move the panel around.
                await this.postMessageToView({
                    subject: "renderToolbar",
                    id: this.title,
                    params: this.form,
                });
                resolveViewLoaded?.();
            }
            this.handleViewMessage(message);
        });

        this.panel.iconPath = {
            light: vscode.Uri.joinPath(
                this.extensionUri,
                "images",
                "icons",
                "form_light.svg",
            ),
            dark: vscode.Uri.joinPath(
                this.extensionUri,
                "images",
                "icons",
                "form_dark.svg",
            ),
        };

        this.panel.webview.html = FormRendering.getWebviewContent(
            this.panel.webview,
            this.extensionUri,
        );

        this.panel.onDidChangeViewState(ev => {
            if (!ev.webviewPanel.active || !ev.webviewPanel.visible) {
                this.panel?.dispose();
            }
        });

        this.panel.onDidDispose(() => {
            this.closeForm(true);
        }, null);
    }

    private setupConnection() {
        if (!this.panel?.webview) {
            return;
        }

        let resolveViewLoaded: (() => void) | undefined = undefined;
        this.viewLoaded = new Promise(resolve => (resolveViewLoaded = resolve));

        this.panel.webview.onDidReceiveMessage((message: ViewMessage) => {
            logger.debug(`Message from ${this.id}: ${JSON.stringify(message)}`);
            if (message.subject === "loaded") {
                resolveViewLoaded?.();
            }
            this.handleViewMessage(message);
        });

        this.panel.webview.html = FormRendering.getWebviewContent(
            this.panel.webview,
            this.extensionUri,
        );
    }

    // Close the form. This method can be called any number of
    // times, the form only closes on the first call.
    private closeForm(
        cancelled: boolean,
        results: PropertyTreeItem = new PropertyTreeItem({
            key: "",
            value: "",
            children: [],
        }),
    ) {
        if (this.formResolver) {
            const formResults = new GenericDialogResults({
                type: cancelled
                    ? GenericDialogReturnType.kCancel
                    : GenericDialogReturnType.kOk,
                items: unpackTree(results),
            });
            this.formResolver?.(formResults);
            this.formResolver = undefined;
        }
    }

    private async handleViewMessage(msg: ViewMessage) {
        if (msg.subject === "formClosed") {
            this.closeForm(msg.isCanceled, unpackTree(msg.form));
            this.panel?.dispose();
        } else if (msg.subject === "toolbarRendered") {
            this.ids = msg.ids;
            this.updateAllItems();
        } else if (msg.subject === "toolbarItemInteraction") {
            if (this.formBackend) {
                await this.formBackend.setValue(
                    msg.id,
                    unpackTree(msg.properties),
                );
                this.updateAllItems();
            }
        }
    }

    updateAllItems() {
        this.ids.forEach(async id => {
            if (this.formBackend) {
                const state = await this.formBackend.updateState(id);
                this.postMessageToView({
                    subject: "updateToolbarItem",
                    id: id,
                    state: state,
                    type: "normal"
                });
            }
        });
    }

    postMessageToView(msg: ExtensionMessage) {
        return this.panel?.webview.postMessage(msg);
    }
}

/**
 * A simple class for creating a form which the user can
 * fill in, before sending it back to the backend.
 */
export class FormViewProvider {
    /**
     * Creates a new view and registers it.
     * @param extensionUri The uri of the extension's root directory
     * @param viewId The id to register the view as. Must match the view id in package.json.
     */
    constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.debug.onDidReceiveDebugSessionCustomEvent(async ev => {
                if (ev.event === CustomEvent.Names.DO_GENERIC_DIALOG_REQUEST) {
                    const location: CustomRequest.RegistryLocationResponse =
                        await ev.session.customRequest(
                            CustomRequest.Names.GET_REGISTRY_LOCATION,
                        );
                    const registry = new ThriftServiceRegistry(
                        new ServiceLocation(location),
                    );

                    const data =
                        ev.body as CustomEvent.ShowGenericDialogRequestData;
                    // Create the backend handler.
                    const backend =
                        await GenericFormViewBackend.Create(registry);
                    const form = this.createForm(
                        data.dialogId,
                        data.title,
                        unpackTree(data.items),
                        backend,
                    );
                    const results = await form.showForm();
                    const args: CustomRequest.GenericDialogResolvedArgs = {
                        id: data.id,
                        items: results.items,
                        results: results.type
                    };
                    ev.session.customRequest(
                        CustomRequest.Names.GENRIC_DIALOG_RESOLVED,
                        args,
                    );
                }
            }),
        );
    }

    public createForm(
        id: string,
        title: string,
        form: PropertyTreeItem,
        formBackend: FormViewBackend | undefined = undefined,
    ): UserForm {
        return new UserForm(
            id,
            title,
            form,
            this.context.extensionUri,
            formBackend,
        );
    }
}

/**
 * Generates the HTML for the view. This does little other than loading the
 * correct scripts. All rendering logic is done in the view itself.
 */
namespace FormRendering {
    export function getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
    ) {
        // load npm packages for standardized UI components and icons
        //! NOTE: ALL files you load here (even indirectly) must be explicitly included in .vscodeignore, so that they are packaged in the .vsix. Webpack will not find these files.
        // load css and js for the view
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                extensionUri,
                "out",
                "webviews",
                "form.js",
            ),
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                extensionUri,
                "node_modules",
                "@vscode/codicons",
                "dist",
                "codicon.css",
            ),
        );

        const nonce = getNonce();

        // install the es6-string-html extension for syntax highlighting here
        return /*html*/ `<!DOCTYPE html>
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
         <script src="${jsUri}" nonce="${nonce}"></script>
         <link rel="stylesheet" href="${codiconsUri}">
         <title>Form</title>
     </head>
     <body>
         <div id="form"></div>
         <div id="imageroot" style="height: 0;" root="${webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "images", "icons"))}">
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
