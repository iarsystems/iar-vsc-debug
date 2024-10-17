/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Detects the user "hovering" over elements (listwindow cells), i.e. keeping
 * the mouse still over the element for a while.
 *
 * Since we create new instances of most elements when re-rendering, we use
 * identifer strings to know which elements are "the same" as a previous
 * instance in the previous render. This lets us keep track of hover state
 * across frames.
 */
export class HoverService {
    private static readonly HOVER_TIMEOUT_MS = 700;

    private pendingHover: {
        elementId: string,
        timer: ReturnType<typeof setTimeout>;
        trigger: MouseEvent,
        callback: (trigger: MouseEvent) => void;
    } | undefined = undefined;
    private lastMousePos: { x: number, y: number} | undefined = undefined;

    /**
     * Sets up hover listeners for the given element.
     * @param element The element to listen for hovers on
     * @param elementId A string identifying the element. Should be unique in
     *   the current DOM, but consistent across re-renders.
     * @param callback The callback to run on hover
     */
    registerHoverElement(
        element: HTMLElement,
        elementId: string,
        callback: (trigger: MouseEvent) => void,
    ) {

        const startTimer = (ev: MouseEvent) => {
            const timer = setTimeout(() => {
                if (this.pendingHover?.elementId === elementId) {
                    this.pendingHover.callback(this.pendingHover.trigger);
                    this.pendingHover = undefined;
                }
            }, HoverService.HOVER_TIMEOUT_MS);
            this.pendingHover = {
                elementId: elementId,
                timer,
                trigger: ev,
                callback,
            };
        };

        const onMove = (ev: MouseEvent) => {
            this.lastMousePos = { x: ev.x, y: ev.y };
            this.cancelTimer();
            startTimer(ev);
        };

        element.addEventListener("mouseenter", ev => {
            if (
                ev.x === this.lastMousePos?.x &&
                ev.y === this.lastMousePos?.y
            ) {
                // We got a mouseenter without moving the mouse, which happens
                // when a render is done (the element is re-constructed under
                // the cursor). Ignore it so we don't trigger hovers on every
                // render.
                return;
            }
            startTimer(ev);
            element.addEventListener("mousemove", onMove);
        });
        element.addEventListener("mouseleave", () => {
            this.cancelTimer();
            element.removeEventListener("mousemove", onMove);
        });
        element.addEventListener("click", () => {
            // Other parts of VS Code don't show hovers after a click, so let's not either.
            this.cancelTimer();
        });
        element.addEventListener("dragstart", () => {
            this.cancelTimer();
        });

        if (this.pendingHover?.elementId === elementId) {
            // A previous instance of this element has a pending hover. We can let
            // it use the same timer, but have it call the new callback instead.
            this.pendingHover.callback = callback;
        }
    }

    private cancelTimer() {
        if (this.pendingHover) {
            clearTimeout(this.pendingHover.timer);
            this.pendingHover = undefined;
        }
    }
}
