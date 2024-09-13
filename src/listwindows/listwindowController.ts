/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Q from "q";
import {
    ChunkInfo,
    EditInfo,
    KeyNavOperation,
    MenuItem,
    Note,
    ScrollOperation,
    SelRange,
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
    ViewMessage,
} from "../../webviews/listwindow/protocol";
import { toBigInt, toInt64 } from "../utils";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceHandler } from "iar-vsc-common/thrift/thriftUtils";
import { ListWindowProxy } from "./listwindowProxy";
import { logger } from "iar-vsc-common/logger";

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

    constructor(
        protected readonly backend: ThriftClient<ListWindowBackend.Client>,
        /** The total number of rows in the window/chunk */
        protected numberOfVisibleRows: number,
    ) {
        this.proxy = new ListWindowProxy(backend.service);
        this.numberOfVisibleRows = 10;
    }

    setMessageSink(sendToView: MessageSink | undefined) {
        this.sendToView = sendToView;

        if (sendToView) {
            this.scheduleCall(() => this.redraw());
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
                    this.scheduleCall(() => this.redraw());
                }
                break;
            }
            case "columnClicked": {
                this.scheduleCall(async() => {
                    await this.backend.service.columnClick(msg.col);
                });
                break;
            }
            case "cellLeftClicked": {
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
                this.activePromise = this.scheduleCall<MenuItem[]>(async() => {
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
            case "scrollOperationPressed": {
                this.activePromise = this.activePromise.then(async() => {
                    await this.scroll(msg.operation, 1);
                    await this.updateAfterScroll();
                });
                break;
            }
            case "keyPressed": {
                this.scheduleCall(async() => {
                    await this.backend.service.handleKeyDown(
                        msg.code,
                        msg.repeat,
                        false, // TO-DO
                        false, // TO-DO
                    );
                });
                break;
            }
            case "getToolbarToolTip": {
                this.scheduleCall<string>(async() => {
                    return await this.backend.service.getToolbarItemTooltip(
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
                this.scheduleCall(async() => {
                    await this.backend.service.setToolbarItemValue(
                        msg.id,
                        msg.properties,
                    );
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
                this.toolbarIds.forEach(id => {
                    this.scheduleCall(async() => {
                        const value =
                            await this.backend.service.getToolbarItemState(id);
                        if (value) {
                            this.sendToView?.({
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
                this.scheduleCall(async() => {
                    const value =
                        await this.backend.service.getToolbarDefinition();
                    if (value && value.length > 0) {
                        this.sendToView?.({
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
        // This is the current sequence.
        this.latestSeq = toBigInt(note.seq);

        // Create a call-chain able to perform the desired update. The update
        // can be canceled if a newer sequence is seen before the update takes
        // place.
        return Q.resolve().then(() =>
            this.scheduleCall(async() => {
                await this.proxy.notify(note);
                await this.postUpdate(note);
                this.currentSeq = toBigInt(note.seq);
                if (
                    note.what !== What.kFreeze &&
                    note.what !== What.kThaw &&
                    this.currentSeq < this.latestSeq
                ) {
                    // Discard.
                    return;
                }
                if (note.what === What.kNormalUpdate) {
                    await this.updateNumberOfRows();
                }

                return this.redraw();
            }),
        );
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
        const contents = await this.proxy.updateRenderParameters(
            this.offset,
            Math.min(this.numberOfVisibleRows, Number(this.numberOfRows)),
        );
        const scrollInfo = await this.getScrollInfo();
        const params: RenderParameters = {
            ...contents,
            scrollInfo,
        };

        console.log("Posting render to view...");
        this.sendToView?.({
            subject: "render",
            params,
        });
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

}

export class StandardListwindowController extends ListwindowController {
    async scroll(op: ScrollOperation, repeat: number) {
        let next = this.offset;
        const fullRowsPerPage = BigInt(Math.floor(this.numberOfVisibleRows));
        for (let i = 0; i < repeat; i++) {
            const last = next + fullRowsPerPage - 1n;
            next = toBigInt(
                await this.backend.service.scroll(
                    op,
                    toInt64(next),
                    toInt64(last),
                ),
            );
        }

        const offset = this.adjustOffset(next);
        if (offset !== this.offset) {
            this.offset = offset;
            return true;
        }
        return false;
    }

    scrollAbs(fraction: number) {
        const fullRowsPerPage = BigInt(Math.floor(this.numberOfVisibleRows));
        let first = BigInt(Math.floor(fraction * Number(this.numberOfRows)));
        if (first + fullRowsPerPage > this.numberOfRows) {
            first = this.numberOfRows - fullRowsPerPage;
        }

        this.offset = first;
        return this.scroll(
            ScrollOperation.kScrollTrack,
            1,
        );
    }

    getScrollInfo() {
        const rowsInPage = BigInt(Math.ceil(this.numberOfVisibleRows));
        return Promise.resolve({
            offset: { value: this.offset.toString() },
            // We lose precision here if totalRows is very large, but these
            // numbers don't need to be exact.
            fractionBefore: Number(this.offset) / Number(this.numberOfRows),
            fractionInWin: Math.ceil(this.numberOfVisibleRows) / Number(this.numberOfRows),
            fractionAfter:
                Number(this.numberOfRows - (this.offset + rowsInPage) - 1n) /
                Number(this.numberOfRows),
        });
    }

    postUpdate(note: Note) {
        const row = toBigInt(note.ensureVisible);
        const offset = this.adjustOffset(this.offset);

        if (row !== -1n) {
            if (
                row < offset ||
                row >= offset + BigInt(Math.floor(this.numberOfVisibleRows))
            ) {
                const fullRowsInPage = BigInt(Math.floor(this.numberOfVisibleRows));
                this.offset = this.adjustOffset(row - fullRowsInPage / 2n);
            }
        }
        return Promise.resolve();
    }

    async keyNavigate(
        op: KeyNavOperation,
        repeat: number,
        flags: number,
    ): Promise<void> {
        return await this.backend.service.keyNavigate(
            op,
            repeat,
            flags,
            Math.floor(this.numberOfVisibleRows),
        );
    }

    private adjustOffset(offset: bigint): bigint {
        const fullRowsPerPage = BigInt(Math.floor(this.numberOfVisibleRows));

        if (offset > this.numberOfRows - fullRowsPerPage) {
            offset = this.numberOfRows - fullRowsPerPage;
        }
        if (offset < 0n) {
            offset = 0n;
        }

        return offset;
    }
}

export class SlidingListwindowController extends ListwindowController {
    private readonly MIN_CHUNK_SIZE = 100;

    private chunk: ChunkInfo = new ChunkInfo({
        atEnd: true,
        atStart: true,
        fractionAfter: 0,
        fractionBefore: 0,
        numberOfRows: 0,
    });

    async scroll(op: ScrollOperation, repeat: number) {
        let next = this.offset;
        const fullRowsPerPage = BigInt(Math.floor(this.numberOfVisibleRows));

        for (let i = 0; i < repeat; i++) {
            const last = next + fullRowsPerPage - 1n;
            next = toBigInt(
                await this.backend.service.scroll(
                    op,
                    toInt64(next),
                    toInt64(last),
                ),
            );
        }

        const prevOffset = this.offset;
        const delta = this.offset - next;
        this.shiftIntoViewWithPlacement(
            this.offset,
            delta,
            true,
        );
        return prevOffset !== this.offset;
    }

    async scrollAbs(fraction: number) {
        await this.navigateTo(fraction);
        return true;
    }

    async getScrollInfo() {
        const rowsInPage = BigInt(Math.ceil(this.numberOfVisibleRows));

        const chunk = await this.backend.service.getChunkInfo();

        if (chunk.numberOfRows <= rowsInPage) {
            return {
                fractionBefore: 0,
                fractionInWin: 1,
                fractionAfter: 0,
            };
        } else {
            // We lose precision here if totalRows is very large, but these
            // numbers don't need to be exact.
            const chunkFrac = 1.0 - chunk.fractionBefore - chunk.fractionAfter;
            const fracPerRow = chunkFrac / chunk.numberOfRows;

            const chunkLinesAfterWin =
                BigInt(chunk.numberOfRows) - this.offset - rowsInPage;

            return {
                fractionInWin: Math.ceil(this.numberOfVisibleRows) * fracPerRow,
                // Fraction before chunk, plus part of chunk above window
                fractionBefore:
                    chunk.fractionBefore + Number(this.offset) * fracPerRow,
                // Fraction after chunk, plus part of chunk below window
                fractionAfter:
                    chunk.fractionAfter +
                    Number(chunkLinesAfterWin) * fracPerRow,
            };
        }
    }

    async postUpdate(note: Note) {
        const fullRowsInPage = BigInt(Math.floor(this.numberOfVisibleRows));
        const prevOffset = this.offset;
        const prevSel = await this.backend.service.getSelection();
        this.chunk = await this.backend.service.getChunkInfo();

        const ensureVisible = toBigInt(note.ensureVisible);
        if (ensureVisible !== -1n) {
            await this.shiftIntoView(
                Number(ensureVisible),
                true,
            );
        } else if (note.anonPos !== "") {
            const chunkPos = Number(fullRowsInPage / 2n);
            const result = await this.backend.service.navigateTo(
                note.anonPos,
                chunkPos,
                this.MIN_CHUNK_SIZE,
            );
            this.chunk = result.chunkInfo;
            await this.shiftIntoView(
                result.chunkPos,
                false,
            );
        } else {
            const chunkPos = Number(this.offset);
            const result = await this.backend.service.navigateTo(
                note.anonPos,
                chunkPos,
                this.MIN_CHUNK_SIZE,
            );
            this.chunk = result.chunkInfo;
            await this.shiftIntoView(
                result.chunkPos,
                false,
            );
        }

        const newChunk = await this.backend.service.getChunkInfo();
        const newSel = await this.backend.service.getSelection();
        if (
            this.offset !== prevOffset ||
            !chunksEqual(this.chunk, newChunk) ||
            !selectionsEqual(prevSel, newSel)
        ) {
            this.scheduleCall(() => this.updateAfterScroll());
        }
    }

    async keyNavigate(
        op: KeyNavOperation,
        repeat: number,
        _flags: number,
    ): Promise<void> {
        if (op === KeyNavOperation.kTopItem) {
            this.navigateTo(0);
            await this.backend.service.setSel(0);
            return;
        }
        if (op === KeyNavOperation.kBottomItem) {
            this.navigateTo(1);
            await this.backend.service.setSel(this.chunk.numberOfRows - 1);
            return;
        }

        const sel = await this.backend.service.getSel();
        if (sel.row === -1) {
            if (sel.pos !== "") {
                // Selection is outside the current chunk
                const fullRowsInPage = Math.floor(this.numberOfVisibleRows);
                const chunkPos = Math.floor(fullRowsInPage / 2);
                const res = await this.backend.service.navigateTo(sel.pos, chunkPos, this.MIN_CHUNK_SIZE);
                this.chunk = res.chunkInfo;
                this.shiftIntoView(res.chunkPos, false);
            } else {
                // No current selection, so just place a new one
                switch (op) {
                    case KeyNavOperation.kNextItem:
                    case KeyNavOperation.kNextItemPage:
                    case KeyNavOperation.kNextRight:
                        await this.navigateTo(1);
                        await this.backend.service.setSel(this.chunk.numberOfRows - 1);
                        break;
                    case KeyNavOperation.kPrevItem:
                    case KeyNavOperation.kPrevItemPage:
                    case KeyNavOperation.kPrevLeft:
                        await this.navigateTo(0);
                        await this.backend.service.setSel(0);
                        break;
                    default:
                        break;
                }
            }
        } else {
            // Move selection
            switch (op) {
                case KeyNavOperation.kNextItem:
                case KeyNavOperation.kNextItemPage:
                case KeyNavOperation.kNextRight:
                case KeyNavOperation.kPrevItem:
                case KeyNavOperation.kPrevItemPage:
                case KeyNavOperation.kPrevLeft: {
                    const rowsInPage = Math.ceil(this.numberOfVisibleRows);
                    const newSel = await this.backend.service.keyNav(op, repeat, rowsInPage);
                    const finalSel = await this.shiftIntoView(newSel, true);
                    await this.backend.service.setSel(finalSel);
                    break;
                }
                default:
                    break;
            }
        }
    }

    // Try to scroll so that 'rowToShow' is visible in the window.
    private async shiftIntoView(
        rowToShow: number,
        allowAdd: boolean,
    ) {
        const fullRowsInPage = Math.floor(this.numberOfVisibleRows);
        let scroll = Number(this.offset);
        if (rowToShow < scroll || rowToShow >= scroll + fullRowsInPage) {
            scroll = rowToShow - fullRowsInPage / 2;
        }
        const shiftAmount = await this.shiftAfterScroll(scroll, allowAdd);
        return rowToShow + shiftAmount;
    }

    // Try to scroll so that 'rowToShow' is at the given position within the
    // window.
    private async shiftIntoViewWithPlacement(
        rowToShow: bigint,
        placeWhere: bigint,
        allowAdd: boolean,
    ) {
        const placementNow = rowToShow - this.offset;
        const scroll = this.offset - (placeWhere - placementNow);
        await this.shiftAfterScroll(
            Number(scroll),
            allowAdd,
        );
    }

    private addBefore(missingRows: number) {
        const surplusNow = this.chunk.numberOfRows - this.MIN_CHUNK_SIZE;
        const maxToTrim = Math.max(surplusNow + missingRows, 0);
        return this.backend.service.addBefore(missingRows, maxToTrim);
    }

    private addAfter(missingRows: number) {
        const surplusNow = this.chunk.numberOfRows - this.MIN_CHUNK_SIZE;
        const maxToTrim = Math.max(surplusNow + missingRows, 0);
        return this.backend.service.addAfter(missingRows, maxToTrim);
    }

    // "Applies" the given scroll to the window.
    // Adjusts the offset and possibly adds rows before or after the current
    // chunk (i.e. "sliding" it), so that the row at 'scroll' becomes the
    // topmost row in the window (or as close to it as possible).
    private async shiftAfterScroll(
        scroll: number,
        allowAdd: boolean,
    ): Promise<number> {
        const fullRowsInPage = BigInt(Math.floor(this.numberOfVisibleRows));
        const rowsInPage = BigInt(Math.ceil(this.numberOfVisibleRows));

        let shiftAmount = 0;
        if (scroll < 0) {
            if (allowAdd && !this.chunk.atStart) {
                const missingRows = -scroll;
                const oldSize = this.chunk.numberOfRows;
                const result = await this.addBefore(missingRows);
                this.chunk = result.chunkInfo;
                const trimmed = result.rows;
                shiftAmount = this.chunk.numberOfRows - oldSize + trimmed;
            }
            scroll = 0;
        } else if (this.chunk.numberOfRows - scroll < rowsInPage) {
            if (allowAdd && !this.chunk.atEnd) {
                const missingRows =
                    rowsInPage - BigInt(this.chunk.numberOfRows - scroll);
                const result = await this.addAfter(Number(missingRows));
                const trimmed = result.rows;
                this.chunk = result.chunkInfo;
                scroll -= trimmed;
                if (this.chunk.numberOfRows - scroll < fullRowsInPage) {
                    scroll = this.chunk.numberOfRows - Number(fullRowsInPage);
                    if (scroll < 0) scroll = 0;
                }
                shiftAmount = -trimmed;
            } else {
                scroll = this.chunk.numberOfRows - Number(fullRowsInPage);
                if (scroll < 0) scroll = 0;
            }
        }

        this.offset = BigInt(scroll);
        return shiftAmount;
    }

    // Places the row at the given fraction of the list in the middle of the
    // window (or as close to the middle as possible).
    private async navigateTo(fraction: number) {
        const fullRowsInPage = Math.floor(this.numberOfVisibleRows);

        const chunkPos = fullRowsInPage / 2;
        const result = await this.backend.service.navigateToFraction(
            fraction,
            chunkPos,
            this.MIN_CHUNK_SIZE,
        );
        this.chunk = result.chunkInfo;
        this.shiftIntoView(result.chunkPos, false);
    }
}

export function chunksEqual(c1: ChunkInfo, c2: ChunkInfo): boolean {
    return (
        c1.atEnd === c2.atEnd &&
        c1.atStart === c2.atStart &&
        c1.fractionAfter === c2.fractionAfter &&
        c1.fractionBefore === c2.fractionBefore &&
        c1.numberOfRows === c2.numberOfRows
    );
}

export function selectionsEqual(s1: SelRange[], s2: SelRange[]): boolean {
    if (s1.length !== s2.length) {
        return false;
    }

    return s1.every(
        (sel, i) => s2[i]?.first === sel.first && s2[i]?.last === sel.last,
    );
}
