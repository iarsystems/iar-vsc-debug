/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { RenderParameters } from "../../protocol";
import { getScrollParent } from "../utils";
import { ScrollObserver } from "./scrollObserver";

type ScrollInfo = RenderParameters["scrollInfo"];

interface ListRenderParams {
    // The element to add list items to
    container: HTMLElement;
    // The element to add above the list items, will be resized
    fillerTop: HTMLElement;
    // The element to add below the list items, will be resized
    fillerBottom: HTMLElement;
    // The height of each item in pixels, must be the same for all items
    itemHeight: number;
    // The list items to render
    items: HTMLElement[];
    // Info about the size of the list and the position of these items within
    // the list. The offset is used to calculate the actual rows of the items,
    // i.e. the items are considered to span the row range `[offset, offset +
    // items.length]`
    scrollInfo: ScrollInfo;
}

/**
 * A vertical list which only renders and knows about a subset of the items
 * (i.e. the currently visible items, plus a few extra to have some margin). The
 * list adds filler elements above and below the known items to make sure the
 * scroll bar matches the full size of the list.
 * Users of the class should use {@link onViewportChanged} to get notified when
 * the visible range changes, and in response call {@link render} to provide a
 * range of items that contains the visible range. Note that
 * {@link onViewportChanged} is called with some delay, so you should provide a
 * range that is at least slightly larger than the visible range.
 *
 */
export class VirtualList {
    /**
     * Called when the visible range of items changes. Arguments refer to the
     * first and last *fully* visible rows.
     */
    onViewportChanged: ((firstrow: bigint, lastRow: bigint) => void) | undefined = undefined;
    private readonly scrollObserver: ScrollObserver;
    private lastScroll = 0;
    private readonly resizeObserver: ResizeObserver;
    private lastViewportHeight = 0;

    private lastRender: ListRenderParams | undefined = undefined;
    private savedScrollState: {
        scroll: number;
        relativeToRow: bigint;
    } | undefined = undefined;

    constructor() {
        this.scrollObserver = new ScrollObserver(() => {
            if (!this.lastRender || !this.onViewportChanged) {
                return;
            }

            const scroll = getScrollParent(this.lastRender.container)?.scrollTop ?? 0;
            // Only notify if there's been a significant change
            if (
                Math.abs(
                    this.lastScroll - scroll,
                ) < this.lastRender.itemHeight
            ) {
                return;
            }
            this.lastScroll = scroll;

            const { first, last } = this.getRangeOfVisibleRowsSafe(
                this.lastRender,
            );
            this.onViewportChanged(first, last);
        });
        this.resizeObserver = new ResizeObserver(() => {
            if (!this.lastRender || !this.onViewportChanged) {
                return;
            }
            // Only notify if there's been a significant change
            const { height } = this.getViewportMetrics(this.lastRender);
            if (
                Math.abs(this.lastViewportHeight - height) <
                this.lastRender.itemHeight
            ) {
                return;
            }
            this.lastViewportHeight = height;

            const { first, last } = this.getRangeOfVisibleRowsSafe(
                this.lastRender,
            );
            this.onViewportChanged(first, last);
        });
    }

    /**
     * Call immediately before calling {@link render}
     */
    preRender(): void {
        if (this.lastRender) {
            const absoluteScroll =
                getScrollParent(this.lastRender.container)?.scrollTop ?? 0;
            this.savedScrollState = {
                scroll:
                    absoluteScroll -
                    this.lastRender.fillerTop.offsetTop,
                relativeToRow: BigInt(this.lastRender.scrollInfo.offset.value),
            };
        }
    }

    /**
     * Render the list, adding the given items to the container.
     * @param params
     * @param ensureVisible If set, attempts to scroll the given row into view
     */
    render(params: ListRenderParams, ensureVisible: bigint | undefined) {
        this.lastRender = params;

        this.resizeObserver.disconnect();
        const scroller = getScrollParent(params.container);
        if (scroller) {
            this.scrollObserver.observe(scroller);
            this.resizeObserver.observe(scroller);
        }

        const offset = BigInt(params.scrollInfo.offset.value);
        const totalHeight =
            (params.items.length * params.itemHeight) /
            params.scrollInfo.fractionInWin;
        const heightAbove = params.scrollInfo.fractionBefore * totalHeight;
        params.fillerTop.style.height = `${heightAbove}px`;
        params.container.appendChild(params.fillerTop);

        for (const item of params.items) {
            params.container.appendChild(item);
        }

        const heightBelow = params.scrollInfo.fractionAfter * totalHeight;
        params.fillerBottom.style.height = `${heightBelow}px`;
        params.container.appendChild(params.fillerBottom);

        // Figure out the new scroll position
        if (this.savedScrollState !== undefined) {
            const scroller = getScrollParent(params.container);
            if (scroller) {
                const rowDiff = offset - this.savedScrollState.relativeToRow;
                const scrollDiff = Number(rowDiff * BigInt(params.itemHeight));
                scroller.scrollTop =
                    params.fillerTop.offsetTop -
                    scrollDiff +
                    this.savedScrollState.scroll;
            }
        }

        if (ensureVisible !== undefined) {
            this.ensureVisible(params, ensureVisible);
        } else if (this.savedScrollState === undefined && offset > 0) {
            this.ensureVisible(
                params,
                offset + BigInt(params.items.length / 2),
                false,
            );
        }
    }

    /**
     * Get the first and last *fully* visible rows.
     */
    getRangeOfVisibleRows(): { first: bigint; last: bigint } | undefined {
        if (!this.lastRender) {
            return undefined;
        }
        return this.getRangeOfVisibleRowsSafe(this.lastRender);
    }

    private getRangeOfVisibleRowsSafe(params: ListRenderParams): { first: bigint; last: bigint } {
        const viewport = this.getViewportMetrics(params);
        const firstRowTop =
            params.fillerTop.offsetTop + params.fillerTop.offsetHeight;
        const firstRowOffset = firstRowTop - viewport.top;
        const firstVisibleRow = Math.ceil(-firstRowOffset / params.itemHeight);

        // Space taken up by any partially visible row at the top
        const topMargin = viewport.top % params.itemHeight;
        const numVisible = Math.floor(
            (viewport.height - topMargin) / params.itemHeight,
        );
        const lastVisibleRow = firstVisibleRow + numVisible - 1;

        const offset = BigInt(params.scrollInfo.offset.value);
        return {
            first: BigInt(firstVisibleRow) + offset,
            last: BigInt(lastVisibleRow) + offset,
        };
    }

    private ensureVisible(
        params: ListRenderParams,
        row: bigint,
        smooth = true,
    ) {
        const offset = BigInt(params.scrollInfo.offset.value);
        if (row < offset || row >= offset + BigInt(params.items.length)) {
            return;
        }

        const viewport = this.getViewportMetrics(params);
        // TODO: handle loss of precision for large rows
        const targetRowTop =
            params.fillerTop.offsetTop +
            params.fillerTop.offsetHeight +
            params.itemHeight * Number(row - offset);
        const isVisible =
            targetRowTop >= viewport.top &&
            targetRowTop + params.itemHeight <= viewport.top + viewport.height;
        if (!isVisible) {
            // Place the target row in the middle of the viewport.
            const scroller = getScrollParent(params.container);
            if (!scroller) {
                return;
            }
            const rowY = targetRowTop + scroller.scrollTop;
            const targetScroll =
                rowY -
                viewport.top -
                (viewport.height / 2 - params.itemHeight / 2);
            scroller.scrollTo({
                top: targetScroll,
                behavior: smooth ? "smooth" : "auto",
            });
        }
    }


    private getViewportMetrics(params: ListRenderParams): {
        top: number;
        height: number;
    } {
        const scroller = getScrollParent(params.container);
        if (!scroller) {
            throw new Error("Virtual list cannot render without being connected");
        }
        const headerHeight = params.fillerTop.offsetTop;
        const viewportHeight = scroller.clientHeight - headerHeight;
        return {
            top: headerHeight + scroller.scrollTop,
            height: viewportHeight,
        };
    }
}
