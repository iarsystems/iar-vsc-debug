/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { KeyNavOperation, Note, ScrollOperation } from "iar-vsc-common/thrift/bindings/listwindow_types";
import { ListwindowController } from "./listwindowController";
import { toBigInt, toInt64 } from "../utils";

/**
 * Controller for non-sliding listwindows.
 */
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
