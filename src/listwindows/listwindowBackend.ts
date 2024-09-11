/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Q from "q";
import {
    EditInfo,
    MenuItem,
    Note,
    ToolbarItemState,
    ToolbarNote,
    ToolbarWhat,
    Tooltip,
    What,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "iar-vsc-common/thrift/bindings/ListWindowFrontend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { ListWindowProxy } from "./listwindowProxy";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { ViewMessage } from "../../webviews/listwindow/protocol";
import { Int64 } from "thrift";

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
type Backend = ThriftClient<ListWindowBackend.Client>;

export class ListWindowBackendHandler {
    private backendClient: Backend | undefined = undefined;
    private frontendLocation: ServiceLocation | undefined = undefined;
    private readonly proxy: ListWindowProxy = new ListWindowProxy();

    private readonly view: ListwindowViewProvider;
    private readonly serviceName: string;

    private activePromise: Q.Promise<unknown> | undefined;

    private readonly currentRow = 0;
    private readonly numberOfVisibleRows = 2;

    // The current sequences handled by the view.
    private currentSeq = new Int64(0);
    private latestSeq = new Int64(0);

    private toolbarIds: string[] = [];

    constructor(view: ListwindowViewProvider, serviceName: string) {
        this.view = view;
        this.serviceName = serviceName;

        // Connect the messages from this view to the the handler, which
        // directs the messages to cspyserver.
        this.view.onMessageReceived = msg => this.handleMessageFromView(msg);
    }

    async connect(serviceRegistry: ThriftServiceRegistry): Promise<void> {
        // Reset the sequence variables for now. We expect a full update
        // soonish.
        this.currentSeq = new Int64(0);
        this.latestSeq = new Int64(0);

        // Connect to the backend to allow for calls to cspyserver
        this.backendClient = await serviceRegistry.findService(
            this.serviceName,
            ListWindowBackend.Client,
        );

        // Connect to the frontend to allow for notifications.
        this.frontendLocation = await serviceRegistry.startService(
            this.serviceName + ".frontend",
            ListWindowFrontend,
            this,
        );
        await this.backendClient.service.connect(this.frontendLocation);
        await this.backendClient.service.show(true);
        this.proxy.connectToClient(this.backendClient.service);

        // Pass a full update to the system to redraw columns, headers etc.
        await this.notify(
            new Note({
                what: What.kFullUpdate,
                anonPos: "",
                seq: new Int64(-1),
                row: new Int64(-1),
                ensureVisible: new Int64(-1),
            }),
        );
        await this.notifyToolbar(
            new ToolbarNote({
                what: ToolbarWhat.kFullUpdate,
                focusOn: -1,
            }),
        );
    }

    async forgetBackend(): Promise<void> {
        // Disconnect the frontend as we don't want any
        // notifications from the un-active session.
        await this.backendClient?.service.disconnect();
        this.backendClient = undefined;
        this.frontendLocation = undefined;
    }

    private scheduleCall<T>(
        call: (backendClient: Backend) => void,
    ): Q.Promise<T | undefined> {
        const chainPromise =
            this.activePromise !== undefined ? this.activePromise : Q.resolve();
        return chainPromise.then(() => {
            try {
                if (this.backendClient) {
                    return call(this.backendClient) as T;
                }
            } catch (e) {
                console.error(`Failed call to cspyserver ${e}`);
            }
            return undefined;
        });
    }

    // Handle all types of callbacks from the view. The calls can end up in two ways:
    // 1. The method is a getter => produce a chain on the promise to send a message to
    //    the underlying view to perform the actual display.
    // 2. The method is an action => just perform the action and rely on the corresponding
    //    update to appear from the backend.
    private handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            case "loaded": {
                break;
            }
            case "rendered": {
                console.log("Rendered...");
                break;
            }
            case "HTMLDump": {
                break;
            }
            case "columnClicked": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.columnClick(msg.col);
                    },
                );
                break;
            }
            case "cellLeftClicked": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.click(
                            new Int64(msg.row),
                            msg.col,
                            msg.flags,
                        );
                    },
                );
                break;
            }
            case "cellDoubleClicked": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.doubleClick(
                            new Int64(msg.row),
                            msg.col,
                        );
                    },
                );
                break;
            }
            case "getContextMenu": {
                this.activePromise = this.scheduleCall<MenuItem[]>(
                    (client: Backend) => {
                        return client.service.getContextMenu(
                            new Int64(msg.row),
                            msg.col,
                        );
                    },
                ).then(value => {
                    if (value) {
                        this.view.postMessageToView({
                            subject: "contextMenuReply",
                            menu: value,
                        });
                    }
                });
                break;
            }
            case "getTooltip": {
                this.activePromise = this.scheduleCall<Tooltip>(
                    (client: Backend) => {
                        return client.service.getToolTip(
                            new Int64(msg.row),
                            msg.row,
                            this.currentRow,
                        );
                    },
                ).then(value => {
                    if (value) {
                        this.view.postMessageToView({
                            subject: "tooltipReply",
                            text: value.text,
                        });
                    }
                });
                break;
            }
            case "rowExpansionToggled": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.toggleExpansion(
                            new Int64(msg.row),
                        );
                    },
                );
                break;
            }
            case "moreLessToggled": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.toggleMoreOrLess(
                            new Int64(msg.row),
                        );
                    },
                );
                break;
            }
            case "checkboxToggled": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.toggleCheckmark(
                            new Int64(msg.row),
                        );
                    },
                );
                break;
            }
            case "getEditableString": {
                msg;
                this.activePromise = this.scheduleCall<EditInfo>(
                    (client: Backend) => {
                        return client.service.getEditableString(
                            new Int64(msg.row),
                            msg.row,
                        );
                    },
                ).then(value => {
                    if (value) {
                        this.view.postMessageToView({
                            subject: "editableStringReply",
                            col: value.column,
                            row: msg.row,
                            info: value,
                        });
                    }
                });
                break;
            }
            case "cellEdited": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.setValue(
                            new Int64(msg.row),
                            msg.col,
                            msg.newValue,
                        );
                    },
                );
                break;
            }
            case "localDrop": {
                this.activePromise = this.scheduleCall<boolean>(
                    (client: Backend) => {
                        return client.service.dropLocal(
                            new Int64(msg.dstRow),
                            msg.dstCol,
                            "",
                            new Int64(msg.srcRow),
                            msg.srcCol,
                        );
                    },
                ).then(value => {
                    if (!value) {
                        console.log("Drop failed");
                    }
                });
                break;
            }
            case "externalDrop": {
                msg;
                this.activePromise = this.scheduleCall<boolean>(
                    (client: Backend) => {
                        return client.service.drop(
                            new Int64(msg.row),
                            msg.col,
                            msg.droppedText,
                        );
                    },
                ).then(value => {
                    if (!value) {
                        console.log("Drop failed");
                    }
                });
                break;
            }
            case "contextItemClicked": {
                this.activePromise = this.scheduleCall<boolean>(
                    (client: Backend) => {
                        return client.service.handleContextMenu(msg.command);
                    },
                );
                break;
            }
            case "keyNavigationPressed": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.keyNavigate(
                            msg.operation,
                            0, // TO-DO
                            0, // TO-DO
                            msg.rowsInPage,
                        );
                    },
                );
                break;
            }
            case "scrollOperationPressed": {
                this.activePromise = this.scheduleCall<Int64>(
                    (client: Backend) => {
                        return client.service.scroll(
                            msg.operation,
                            new Int64(msg.firstRow),
                            new Int64(msg.lastRow),
                        );
                    },
                ).then(value => {
                    if (value) {
                        console.log(`Scrolled to ${value}`);
                    }
                });
                break;
            }
            case "keyPressed": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.handleKeyDown(
                            msg.code,
                            msg.repeat,
                            false, // TO-DO
                            false, // TO-DO
                        );
                    },
                );
                break;
            }
            case "getToolbarToolTip": {
                this.activePromise = this.scheduleCall<string>(
                    (client: Backend) => {
                        return client.service.getToolbarItemTooltip(msg.id);
                    },
                ).then(value => {
                    if (value) {
                        if (value) {
                            this.view.postMessageToView({
                                subject: "tooltipReply",
                                text: value,
                            });
                        }
                    }
                });
                break;
            }
            case "toolbarItemInteraction": {
                this.activePromise = this.scheduleCall<void>(
                    (client: Backend) => {
                        return client.service.setToolbarItemValue(
                            msg.id,
                            msg.properties,
                        );
                    },
                );
                break;
            }
            case "toolbarRendered": {
                this.toolbarIds = msg.ids;
                this.notifyToolbar(
                    new ToolbarNote({
                        what: ToolbarWhat.kNormalUpdate,
                        focusOn: 0,
                    }),
                );
                break;
            }
        }
    }

    notifyToolbar(note: ToolbarNote): Q.Promise<void> {
        switch (note.what) {
            case ToolbarWhat.kNormalUpdate: {
                this.toolbarIds.forEach(id => {
                    this.activePromise = this.scheduleCall<ToolbarItemState>(
                        client => {
                            return client.service.getToolbarItemState(id);
                        },
                    ).then(value => {
                        if (value) {
                            this.view?.postMessageToView({
                                subject: "updateToolbarItem",
                                id: id,
                                state: value,
                            });
                        }
                    });
                });
                break;
            }
            case ToolbarWhat.kFullUpdate: {
                this.activePromise = this.scheduleCall<string>(client => {
                    return client.service.getToolbarDefinition();
                }).then(value => {
                    if (value && value.length > 0) {
                        this.view?.postMessageToView({
                            subject: "renderToolbar",
                            params: value,
                        });
                    }
                });
                break;
            }
            case ToolbarWhat.kFocusOn: {
                break;
            }
        }
        return Q.resolve();
    }

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

        // Create a call-chain able to perform the desired update. The update
        // can be canceled if a newer sequence is seen before the update takes
        // place.
        const chainPromise =
            this.activePromise !== undefined ? this.activePromise : Q.resolve();
        const updatePromise = chainPromise.then(async () => {
            await this.proxy.notify(note);
            return note;
        });

        updatePromise.then(async (cN: Note) => {
            this.currentSeq = cN.seq;
            if (
                cN.what !== What.kFreeze &&
                cN.what !== What.kThaw &&
                this.currentSeq < this.latestSeq
            ) {
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
