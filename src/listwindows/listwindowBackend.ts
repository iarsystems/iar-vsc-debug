/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
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
export class ListWindowBackendHandler {
    private readonly view: ListwindowViewProvider;
    private readonly serviceName: string;

    private numberOfVisibleRows = 0;

    // Maps session IDs to view controllers.
    private readonly sessions: Map<string, ListwindowController> = new Map();
    private activeController: ListwindowController | undefined = undefined;

    constructor(view: ListwindowViewProvider, serviceName: string) {
        this.view = view;
        this.serviceName = serviceName;

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
    }

    async connect(sessionId: string, serviceRegistry: ThriftServiceRegistry): Promise<void> {
        // Connect to the backend to allow for calls to cspyserver
        const backendClient = await serviceRegistry.findService(
            this.serviceName,
            ListWindowBackend.Client,
        );

        let controller: ListwindowController;
        if (await backendClient.service.isSliding()) {
            controller = new SlidingListwindowController(backendClient, this.numberOfVisibleRows);
        } else {
            controller = new StandardListwindowController(backendClient, this.numberOfVisibleRows);
        }

        // Connect to the frontend to allow for notifications.
        const frontendLocation = await serviceRegistry.startService(
            this.serviceName + ".frontend",
            ListWindowFrontend,
            controller,
        );
        await backendClient.service.connect(frontendLocation);
        await backendClient.service.show(true);

        this.sessions.set(sessionId, controller);

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
            throw new Error("Tried setting active session without connecting to it first");
        }
        this.activeController = controller;
        controller.setMessageSink(msg => {
            this.view.postMessageToView(msg);
        });
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
}
