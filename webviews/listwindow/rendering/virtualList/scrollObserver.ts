/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Watches for scroll events on a container.
 */
export class ScrollObserver {
    private paused = false;
    private controller = new AbortController();

    constructor(private readonly onScroll: () => void) {}

    /**
     * Watches the given element for scroll events. Any previously watched
     * elements will stop being watched.
     */
    observe(elem: HTMLElement) {
        // This cancels any previous listeners
        this.controller.abort();
        this.controller = new AbortController();

        elem.addEventListener("scroll", () => {
            if (this.paused) {
                return;
            }

            this.onScroll();
        }, { signal: this.controller.signal, passive: true });
    }

    setPaused(paused: boolean) {
        this.paused = paused;
    }
}