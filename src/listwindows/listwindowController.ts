/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Q from "q";
import {
    EditInfo,
    KeyNavOperation,
    MenuItem,
    Note,
    ScrollOperation,
    ToolbarNote,
    ToolbarWhat,
    Tooltip,
    What,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as ListWindowFrontend from "iar-vsc-common/thrift/bindings/ListWindowFrontend";
import {
    ExtensionMessage,
    RenderParameters,
    Serializable,
    ViewMessage,
} from "../../webviews/listwindow/protocol";
import { toBigInt, toInt64 } from "../utils";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceHandler } from "iar-vsc-common/thrift/thriftUtils";
import { ListWindowProxy } from "./listwindowProxy";
import { logger } from "iar-vsc-common/logger";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import { Int64 } from "thrift";
import { ToolbarInterface } from "./clients/listwindowBackendClient";

/**
 * A function which a {@link ListwindowController} can use to send messages to
 * its webview.
 */
type MessageSink = (msg: ExtensionMessage) => void;

/**
 * Sits between a webview and a cspyserver backend. It handles messages from the
 * webview (e.g. user interactions), usually by asking the backend for a
 * response and/or updating some scrolling parameters and redrawing the view. It
 * also handles messages from the backend, usually by refreshing some data and
 * redrawing the view.
 *
 * Note that a controller may not always be "attached" to a webview. For each
 * webview, we create one controller per debug session (i.e. per cspyserver
 * instance), but only one of them can be attached to the webview at a time. A
 * controller that is not attached will not receive webview messages (via
 * {@link handleMessageFromView}), and will not have a {@link MessageSink} to
 * send messages to the webview.
 */
export abstract class ListwindowController implements ThriftServiceHandler<ListWindowFrontend.Client> {
    private static readonly FREEZE_DELAY_MS = 100;

    private sendToView: MessageSink | undefined = undefined;

    private readonly proxy: ListWindowProxy;
    private activePromise: Promise<unknown> = Promise.resolve();

    /** The index of the first row to draw (i.e. the first visible row) */
    protected offset = 0n;
    /** The total number of rows in the window/chunk */
    protected numberOfRows = 0n;

    // The current sequences handled by the view.
    private currentSeq = 0n;
    private latestSeq = 0n;

    private toolbarIds: string[] = [];

    private lastRenderParams: RenderParameters | undefined = undefined;

    constructor(
        protected readonly backend: ThriftClient<ListWindowBackend.Client>,
        protected readonly toolbarInterface: ToolbarInterface,
        /** The total number of rows in the window/chunk */
        protected numberOfVisibleRows: number,
    ) {
        this.proxy = new ListWindowProxy(backend.service);
    }

    setMessageSink(sendToView: MessageSink | undefined) {
        this.sendToView = sendToView;
        this.lastRenderParams = undefined;

        if (sendToView) {
            this.scheduleCall(() => this.redraw());
            this.notifyToolbar(
                new ToolbarNote({
                    what: ToolbarWhat.kFullUpdate,
                    focusOn: -1,
                }),
            );
        }
    }

    async dispose() {
        await this.backend.service.disconnect();
        this.backend.close();
    }

    public abstract scroll(
        op: ScrollOperation,
        repeat: number,
    ): Promise<boolean>;

    public abstract scrollAbs(
        fraction: number,
    ): Promise<boolean>;

    public abstract getScrollInfo(): Promise<RenderParameters["scrollInfo"]>;

    /**
     * Invoked when an update has been received and processed.
     */
    public abstract postUpdate(note: Note): Promise<void>;

    public abstract keyNavigate(
        op: KeyNavOperation,
        repeat: number,
        flags: number,
    ): Promise<void>;

    // Handle all types of callbacks from the view. The calls can end up in two ways:
    // 1. The method is a getter => produce a chain on the promise to send a message to
    //    the underlying view to perform the actual display.
    // 2. The method is an action => just perform the action and rely on the corresponding
    //    update to appear from the backend.
    handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            case "loaded": {
                this.lastRenderParams = undefined;
                this.notify(
                    new Note({
                        what: What.kFullUpdate,
                        anonPos: "",
                        seq: new Int64(-1),
                        row: new Int64(-1),
                        ensureVisible: new Int64(-1),
                    }),
                );
                this.notifyToolbar(
                    new ToolbarNote({
                        what: ToolbarWhat.kFullUpdate,
                        focusOn: -1,
                    }),
                );
                break;
            }
            case "rendered": {
                break;
            }
            case "HTMLDump":
                break;
            case "viewportChanged": {
                const oldValue = this.numberOfVisibleRows;
                this.numberOfVisibleRows = msg.rowsInPage;
                if (Math.ceil(msg.rowsInPage) !== Math.ceil(oldValue)) {
                    this.scheduleCall(async() => {
                        const unfilledSpace =
                            this.numberOfVisibleRows -
                            Number(this.numberOfRows - (this.offset));
                        if (unfilledSpace >= 1 && this.offset !== 0n) {
                            // We are at the bottom and can scroll down to fit
                            // another row at the top. Do a kScrollTrack to make
                            // the controller recalculate what scroll position
                            // it wants.
                            await this.scroll(ScrollOperation.kScrollTrack, 1);
                        }
                        await this.redraw();
                    });
                }
                break;
            }
            case "columnClicked": {
                this.scheduleCall(async() => {
                    await this.backend.service.columnClick(msg.col);
                });
                break;
            }
            case "cellClicked": {
                this.scheduleCall(async() => {
                    await this.backend.service.click(
                        toInt64(msg.row),
                        msg.col,
                        msg.flags,
                    );
                });
                break;
            }
            case "cellDoubleClicked": {
                this.scheduleCall(async() => {
                    return await this.backend.service.doubleClick(
                        toInt64(msg.row),
                        msg.col,
                    );
                });
                break;
            }
            case "getContextMenu": {
                this.scheduleCall<MenuItem[]>(async() => {
                    return await this.backend.service.getContextMenu(
                        toInt64(msg.row),
                        msg.col,
                    );
                }).then(value => {
                    if (value) {
                        this.sendToView?.({
                            subject: "contextMenuReply",
                            menu: value,
                        });
                    }
                });
                break;
            }
            case "getTooltip": {
                this.scheduleCall<Tooltip>(async() => {
                    return await this.backend.service.getToolTip(
                        toInt64(msg.row),
                        msg.col,
                        // Other implementations use -1 here, not sure what
                        // it is supposed to mean.
                        -1,
                    );
                }).then(value => {
                    if (value) {
                        this.sendToView?.({
                            subject: "tooltipReply",
                            text: value.text,
                        });
                    }
                });
                break;
            }
            case "rowExpansionToggled": {
                this.scheduleCall(async() => {
                    await this.backend.service.toggleExpansion(
                        toInt64(msg.row),
                    );
                    this.proxy.invalidateAllRows();
                    await this.updateNumberOfRows();
                    await this.redraw();
                });
                break;
            }
            case "moreLessToggled": {
                this.scheduleCall(async() => {
                    await this.backend.service.toggleMoreOrLess(
                        toInt64(msg.row),
                    );
                    this.proxy.invalidateAllRows();
                    await this.updateNumberOfRows();
                    await this.redraw();
                });
                break;
            }
            case "checkboxToggled": {
                this.scheduleCall(async() => {
                    await this.backend.service.toggleCheckmark(
                        toInt64(msg.row),
                    );
                });
                break;
            }
            case "getEditableString": {
                this.scheduleCall<EditInfo>(async() => {
                    return await this.backend.service.getEditableString(
                        toInt64(msg.row),
                        msg.col,
                    );
                }).then(value => {
                    if (value) {
                        this.sendToView?.({
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
                this.scheduleCall(async() => {
                    await this.backend.service.setValue(
                        toInt64(msg.row),
                        msg.col,
                        msg.newValue,
                    );
                });
                break;
            }
            case "localDrop": {
                this.scheduleCall<boolean>(async() => {
                    return await this.backend.service.dropLocal(
                        toInt64(msg.dstRow),
                        msg.dstCol,
                        "",
                        toInt64(msg.srcRow),
                        msg.srcCol,
                    );
                }).then(value => {
                    if (!value) {
                        console.log("Drop failed");
                    }
                });
                break;
            }
            case "externalDrop": {
                this.scheduleCall<boolean>(async() => {
                    return await this.backend.service.drop(
                        toInt64(msg.row),
                        msg.col,
                        msg.droppedText,
                    );
                }).then(value => {
                    if (!value) {
                        console.log("Drop failed");
                    }
                });
                break;
            }
            case "contextItemClicked": {
                this.scheduleCall<void>(async() => {
                    await this.backend.service.handleContextMenu(msg.command);
                });
                break;
            }
            case "keyNavigationPressed": {
                this.activePromise = this.activePromise.then(async() => {
                    // TODO: flags
                    await this.keyNavigate(
                        msg.operation,
                        1,
                        0,
                    );
                    await this.updateAfterScroll();
                });
                break;
            }
            case "absoluteScrolled": {
                this.activePromise = this.activePromise.then(async() => {
                    if (await this.scrollAbs(msg.fraction)) {
                        await this.updateAfterScroll();
                    }
                });
                break;
            }
            case "scrollOperationPressed": {
                this.activePromise = this.activePromise.then(async() => {
                    await this.scroll(msg.operation, 1);
                    await this.updateAfterScroll();
                });
                break;
            }
            case "keyPressed": {
                this.scheduleCall(async() => {
                    await this.backend.service.handleChar(
                        msg.code,
                        msg.repeat,
                    );
                });
                break;
            }
            case "getToolbarToolTip": {
                this.scheduleCall<string>(async() => {
                    return await this.toolbarInterface.getToolbarItemTooltip(
                        msg.id,
                    );
                }).then(value => {
                    this.sendToView?.({
                        subject: "tooltipReply",
                        text: value,
                    });
                });
                break;
            }
            case "toolbarItemInteraction": {
                const item = this.unpackTree(msg.properties);
                this.scheduleCall(async() => {
                    await this.toolbarInterface.setToolbarItemValue(
                        msg.id,
                        item,
                    );
                    const value =
                        await this.toolbarInterface.getToolbarItemState(msg.id);
                    if (value) {
                        this.sendToView?.({
                            subject: "updateToolbarItem",
                            id: msg.id,
                            state: value,
                        });
                    }
                });
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
                this.scheduleCall(() => {
                    return this.updateToolbarStates();
                });
                break;
            }
            case ToolbarWhat.kFullUpdate: {
                this.scheduleCall(async() => {
                    const value =
                        await this.toolbarInterface.getToolbarDefinition();
                    if (value && value.children.length > 0) {
                        this.sendToView?.({
                            subject: "renderToolbar",
                            params: value,
                        });
                    }
                    await this.updateToolbarStates();
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
        // This is the current sequence.
        this.latestSeq = toBigInt(note.seq);

        return Q.resolve().then(async() => {
            // First update the data according to what the note says.
            await this.scheduleCall(async() => {
                await this.proxy.notify(note);
                await this.postUpdate(note);

            });

            // Then decide if we should redraw. We give some time for new notes to
            // arrive; if there's a newer note, it will cause its own redraw and we
            // can skip this one. Note that we give extra time for freeze notes to
            // be skipped, since they are often shortly followed by a thaw note
            // (e.g. when stepping) and will cause flickering if drawn immediately.
            await new Promise(resolve =>
                setTimeout(
                    resolve,
                    note.what === What.kFreeze
                        ? ListwindowController.FREEZE_DELAY_MS
                        : 0,
                ),
            );
            await this.scheduleCall(async() => {
                this.currentSeq = toBigInt(note.seq);
                if (this.currentSeq < this.latestSeq) {
                    return;
                }

                await this.updateNumberOfRows();
                return this.redraw();
            });
        });
    }

    protected async updateAfterScroll() {
        this.proxy.invalidateAllRows();
        await this.redraw();
    }

    protected scheduleCall<T>(call: () => Promise<T>): Promise<T | undefined> {
        const handler = () => {
            try {
                return call();
            } catch (e) {
                logger.error(`Failed call to cspyserver ${e}`);
            }
            return undefined;
        };
        const promise = this.activePromise.then(handler, handler);
        this.activePromise = promise;
        return promise;
    }

    private async redraw() {
        if (this.sendToView === undefined) {
            return;
        }

        const contents = await this.proxy.updateRenderParameters(
            this.offset,
            Math.min(this.numberOfVisibleRows, Number(this.numberOfRows)),
        );
        const scrollInfo = await this.getScrollInfo();
        const params: RenderParameters = {
            ...contents,
            scrollInfo,
        };
        // VSC-477 For performance reasons, we avoid rendering the same thing
        // twice.
        if (JSON.stringify(params) === JSON.stringify(this.lastRenderParams)) {
            return;
        }

        this.lastRenderParams = params;
        this.sendToView?.({
            subject: "render",
            params,
        });
    }

    private async updateToolbarStates() {
        for (const id of this.toolbarIds) {
            const value =
                await this.toolbarInterface.getToolbarItemState(id);
            if (value) {
                this.sendToView?.({
                    subject: "updateToolbarItem",
                    id: id,
                    state: value,
                });
            }
        }
    }

    private async updateNumberOfRows() {
        let rows: bigint;
        if (await this.backend.service.isSliding()) {
            const chunk = await this.backend.service.getChunkInfo();
            rows = BigInt(chunk.numberOfRows);
        } else {
            rows = toBigInt(await this.backend.service.getNumberOfRows());
        }
        this.numberOfRows = rows;
    }

    private unpackTree(
        treeDescription: Serializable<PropertyTreeItem>,
    ): PropertyTreeItem {
        const item = new PropertyTreeItem();

        item.key = treeDescription.key;
        item.value = treeDescription.value;
        item.children = [];
        treeDescription.children.forEach(
            (element: Serializable<PropertyTreeItem>) => {
                item.children.push(this.unpackTree(element));
            },
        );
        return item;
    }


}
