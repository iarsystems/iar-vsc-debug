/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import {
    Note,
    ToolbarNote,
    ToolbarWhat,
    What,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "iar-vsc-common/thrift/bindings/ListWindowFrontend";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { Int64 } from "thrift";
import { ListwindowController } from "./listwindowController";
import { SlidingListwindowController } from "./slidingListwindowController";
import { StandardListwindowController } from "./standardListwindowController";
import { CTor, ServiceClientFactory } from "./listwindowClientFactory";
import {AbstractListwindowClient} from "./clients/listwindowBackendClient";


/**
 * This class acts as the intermediary layer between the webview (ListwindowViewProvider)
 * and the cspyserver backend.
 * User interactions from the webview enters via the handleMessageFromView and notifications
 * are handled by the notify method, which is how the cspyserver interacts with the VsCode
 * client.
 *
 * To increase responsiveness, a row-proxy is placed between the ListWindowBackendHandler
 * and cspyserver.
 */
export class ListWindowBackendHandler<T extends ListWindowBackend.Client> {
    public readonly view: ListwindowViewProvider;
    public readonly serviceName: string;

    private numberOfVisibleRows = 0;

    // Maps session IDs to view controllers.
    private readonly sessions: Map<string, ListwindowController> = new Map();
    public activeController: ListwindowController | undefined = undefined;

    private readonly clientFactory: CTor<AbstractListwindowClient<T>> | undefined =
        undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        view: ListwindowViewProvider,
        serviceName: string,
        cf: CTor<AbstractListwindowClient<T>> | undefined,
    ) {
        this.view = view;
        this.serviceName = serviceName;
        this.clientFactory = cf;

        // Connect the messages from this view to the the handler, which
        // directs the messages to cspyserver.
        this.view.onMessageReceived = msg => {
            // If the viewport size changes, we want to notify all instances
            // immediately, since it affects how they respond to notifications
            // in the background.
            if (msg.subject === "viewportChanged") {
                this.numberOfVisibleRows = msg.rowsInPage;
                for (const controller of this.sessions.values()) {
                    controller.handleMessageFromView(msg);
                }
                return;
            }
            // Other messages are only relevant to the visible session.
            this.activeController?.handleMessageFromView(msg);
        };
        this.view.onVisibilityChanged = visible => {
            if (!visible) {
                this.activeController?.setMessageSink(undefined);
            } else {
                this.activeController?.setMessageSink(msg => {
                    this.view.postMessageToView(msg);
                });
            }
        };
    }

    async connect(
        session: vscode.DebugSession,
        serviceRegistry: ThriftServiceRegistry,
        supportsGenericToolbars: boolean,
    ): Promise<void> {
        // Connect to the backend to allow for calls to cspyserver
        const [backendClient, toolbarInterface] =
            await ServiceClientFactory.createServices(
                this.serviceName,
                serviceRegistry,
                supportsGenericToolbars ? undefined : this.clientFactory,
            );
        await backendClient.service.setContentStorageFile(
            await this.getContentStorageFile(session),
        );

        let controller: ListwindowController;
        if (await backendClient.service.isSliding()) {
            controller = new SlidingListwindowController(
                backendClient,
                toolbarInterface,
                this.numberOfVisibleRows,
            );
        } else {
            controller = new StandardListwindowController(
                backendClient,
                toolbarInterface,
                this.numberOfVisibleRows,
            );
        }

        // Connect to the frontend to allow for notifications.
        const frontendLocation = await serviceRegistry.startService(
            this.serviceName + ".frontend",
            ListWindowFrontend,
            controller,
        );
        await backendClient.service.connect(frontendLocation);
        await backendClient.service.show(true);

        this.sessions.set(session.id, controller);

        // Pass a full update to the system to update columns, headers etc. It
        // is important that this happens here, when we know the model is not
        // frozen.
        await controller.notify(
            new Note({
                what: What.kFullUpdate,
                anonPos: "",
                seq: new Int64(-1),
                row: new Int64(-1),
                ensureVisible: new Int64(-1),
            }),
        );
        await controller.notifyToolbar(
            new ToolbarNote({
                what: ToolbarWhat.kFullUpdate,
                focusOn: -1,
            }),
        );
    }

    setActiveSession(sessionId: string | undefined) {
        if (this.activeController) {
            this.activeController.setMessageSink(undefined);
        }

        if (!sessionId) {
            this.activeController = undefined;
            return;
        }

        const controller = this.sessions.get(sessionId);
        if (!controller) {
            this.view.setEnabled(false);
            return;
        }
        this.view.setEnabled(true);
        this.activeController = controller;
        if (this.view.visible) {
            controller.setMessageSink(msg => {
                this.view.postMessageToView(msg);
            });
        }
    }

    forgetSession(sessionId: string) {
        const controller = this.sessions.get(sessionId);
        if (controller) {
            if (controller === this.activeController) {
                this.setActiveSession(undefined);
            }
            controller.dispose();
        }

    }

    private async getContentStorageFile(session: vscode.DebugSession) {
        await fs.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
        // Use a file unique to the debug configuration name. For e.g. quick
        // watch history, we probably don't want the data to be shared between
        // debug sessions.
        const sessionName = session.name.replace(ILLEGAL_PATH_CHARS, "");
        const filename = "content-storage-" + this.serviceName + "-" + sessionName + ".json";
        return path.join(this.context.globalStorageUri.fsPath, filename);
    }
}

const ILLEGAL_PATH_CHARS = /[<>:"/\\|?*]/g;
