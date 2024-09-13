/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ChunkInfo, KeyNavOperation, Note, ScrollOperation, SelRange } from "iar-vsc-common/thrift/bindings/listwindow_types";
import { ListwindowController } from "./listwindowController";
import { toBigInt, toInt64 } from "../utils";

/**
 * Controller for sliding listwindows.
 * The scrolling code is fairly complex... It's almost completely copied from
 * IaqListWindow.cpp in the IDE, so look to that file for a more
 * documented/commented version of this code.
 */
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
