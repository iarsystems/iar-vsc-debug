/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { RenderParameters } from "../../protocol";
import { getScrollParent } from "../utils";

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
    // the list.
    scrollInfo: ScrollInfo;
}

/**
 * A vertical list which only renders and knows about a subset of the items
 * (i.e. the currently visible items). The list adds filler elements above and
 * below the visible items to make sure the scroll bar matches the full size of
 * the list.
 */
export class VirtualList {
    private lastRender: ListRenderParams | undefined = undefined;

    render(params: ListRenderParams) {
        this.lastRender = params;

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
        const scroller = getScrollParent(params.container);
        if (scroller) {
            scroller.scrollTop = params.fillerTop.offsetHeight;
        }
    }

    /**
     * Get the number of visible rows in the list, may be a decimal value.
     */
    getNumVisibleRows(): number | undefined {
        if (!this.lastRender) {
            return undefined;
        }
        const scroller = getScrollParent(this.lastRender.container);
        if (!scroller) {
            return undefined;
        }

        const headerHeight = this.lastRender.fillerTop.offsetTop;
        const viewportHeight = scroller.clientHeight - headerHeight;

        return viewportHeight / this.lastRender.itemHeight;
    }
}
