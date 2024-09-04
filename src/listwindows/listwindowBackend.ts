/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Q from "q";
import { Note, What } from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "iar-vsc-common/thrift/bindings/ListWindowFrontend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { ListWindowProxy } from "./listwindowProxy";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { RenderParameters, ViewMessage } from "../../webviews/listwindow/protocol";
import { Int64 } from "thrift";

export interface Cell {
    value: string;
    isEditable: boolean;
}

export interface ListWindowRowReference {
    cells: Cell[];
    hasChildren: boolean;
    parentIds: string[][];
}

/**
 * Poses as a frontend for a list window, managing all events and keeping track of all its rows.
 * The contents are represented to users of this class as a tree, consisting of some top-level rows {@link getTopLevelRows},
 * and their children {@link getChildrenOf}.
 * NOTE: This class requires that the window cannot have identical rows at the same level (e.g. identical top-level rows
 * or identical children of some row). This works e.g. for variable windows, but might not be true for other windows.
 * Getting around this limitation is *possible*, but way too complicated to be worth doing until we actually need it.
 * NOTE 2: This class **only** works with non-sliding list windows.
 */
export class ListWindowBackendHandler {
    private backendClient: ThriftClient<ListWindowBackend.Client> | undefined =
        undefined;
    private frontendLocation: ServiceLocation | undefined = undefined;
    private readonly proxy: ListWindowProxy = new ListWindowProxy();

    private readonly view: ListwindowViewProvider;
    private readonly serviceName: string;

    private readonly currentRow = 0;
    private readonly numberOfVisibleRows = 2;
    private currentSeq = new Int64(0);
    private latestSeq = new Int64(0);

    constructor(
        view: ListwindowViewProvider,
        serviceName: string
    ) {
        this.view = view;
        this.serviceName = serviceName;

        // Connect the messages from this view to the the handler, which
        // directs the messages to cspyserver.
        this.view.onMessageReceived = msg => this.handleMessageFromView(msg);
    }

    async connect(
        serviceRegistry: ThriftServiceRegistry
    ): Promise<void> {
        this.backendClient = await serviceRegistry.findService(
            this.serviceName,
            ListWindowBackend.Client,
        );

        this.frontendLocation = await serviceRegistry.startService(
            this.serviceName + ".frontend",
            ListWindowFrontend,
            this,
        );
        await this.backendClient.service.connect(this.frontendLocation);
        await this.backendClient.service.show(true);
        this.proxy.connectToClient(this.backendClient.service);
        await this.updateWindowContent();
    }

    async disconnect(): Promise<void> {
        await this.backendClient?.service.disconnect();
        this.backendClient?.close();
        this.backendClient = undefined;
        this.frontendLocation = undefined;
    }

    private handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            case "loaded": {
                break;
            }
            case "rendered": {
                console.log("Rendered...");
                break;
            }
            case "HTMLDump":
            case "columnClicked":
            case "cellLeftClicked":
            case "cellDoubleClicked":
            case "getContextMenu":
            case "getTooltip":
            case "rowExpansionToggled":
            case "moreLessToggled":
            case "checkboxToggled":
            case "getEditableString":
            case "cellEdited":
            case "localDrop":
            case "externalDrop":
            case "contextItemClicked":
            case "keyNavigationPressed":
            case "scrollOperationPressed":
            case "keyPressed":
        }
    }

    public updateWindowContent() {
        const windowContent = this.proxy.updateRenderParameters(
            this.currentRow,
            this.numberOfVisibleRows,
        );

        return windowContent.then((contents: RenderParameters) => {
            console.log("Posting render to view...");
            this.view?.postMessageToView({
                subject: "render",
                params: contents,
            });
        });
    }

    private activePromise: Q.Promise<unknown> | undefined;

    // callback from list window backend
    notify(note: Note): Q.Promise<void> {
        if (!this.view) {
            return Q.resolve();
        }
        // This is the current sequence.
        this.latestSeq = note.seq;
        if (note.what === What.kEnsureVisible) {
            this.view.show();
        }

        const chainPromise =
            this.activePromise !== undefined ? this.activePromise : Q.resolve();

        const updatePromise = chainPromise.then(async () => {
            await this.proxy.notify(note);
            return note;
        });

        updatePromise.then(async (cN: Note) => {
            this.currentSeq = cN.seq;
            // This does not require any action from the update concept.
            if (note.what === What.kFreeze || note.what === What.kThaw) {
                return;
            }

            if (this.currentSeq < this.latestSeq) {
                // Discard.
                return;
            }

            const contents = await this.proxy.updateRenderParameters(
                this.currentRow,
                this.numberOfVisibleRows,
            );
            console.log("Posting render to view...");
            await this.view?.postMessageToView({
                subject: "render",
                params: contents,
            });
        });
        this.activePromise = updatePromise;
        return Q.resolve();
    }

}
