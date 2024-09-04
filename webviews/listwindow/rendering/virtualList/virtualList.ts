/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export interface ScrollInfo {
    itemHeight: number;
    offset: bigint;
    totalItems: bigint;
}

interface RenderResult {
    container: HTMLElement;
    items: HTMLElement[];
    scrollInfo: ScrollInfo
}

/**
 * Assumptions:
 * * All items have the same height
 */
export class VirtualList {
    private lastRender: RenderResult | undefined = undefined;
    private savedScrollState: number | undefined = undefined;

    preRender(): void {
        if (this.lastRender) {
            this.savedScrollState = this.lastRender.container.scrollTop;
        }
        // TODO: save scroll state
    }

    render(
        container: HTMLElement,
        items: HTMLElement[],
        fillerTop: HTMLElement,
        fillerBottom: HTMLElement,
        scrollInfo: ScrollInfo,
    ) {
        // TODO: store container
        fillerTop.style.height = `${scrollInfo.offset * BigInt(scrollInfo.itemHeight)}px`;
        container.appendChild(fillerTop);

        for (const item of items) {
            container.appendChild(item);
        }

        const itemsBelow =
            scrollInfo.totalItems - BigInt(items.length) - scrollInfo.offset;
        fillerBottom.style.height = `${itemsBelow * BigInt(scrollInfo.itemHeight)}px`;
        container.appendChild(fillerBottom);

        this.lastRender = { container, items, scrollInfo };
    }

    postRender(ensureVisible: bigint | undefined): void {
        if (ensureVisible !== undefined) {
            this.ensureVisible(ensureVisible);
            return;
        }

        if (!this.lastRender) {
            return;
        }
        if (this.savedScrollState !== undefined) {
            // TODO: be smarter about this
            this.lastRender.container.scrollTop = this.savedScrollState;
        } else if (this.lastRender.scrollInfo.offset > 0) {
            this.ensureVisible(this.lastRender.scrollInfo.offset + BigInt(this.lastRender.items.length / 2));

        }
    }

    private ensureVisible(_row: bigint) {
        if (!this.lastRender) {
            return;
        }
        // TODO:
    }

    // getVisibleItemRange(): { start: number; end: number } {
}
