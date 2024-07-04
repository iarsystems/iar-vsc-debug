/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../../events";
import { createCss } from "../styles/createCss";
import { customElement } from "../utils";

/**
 * Emitted when the user starts dragging the resize handle
 */
export type ResizeHandleDragBeginEvent = CustomEvent<ResizeHandleDragBeginEvent.Detail>;
export namespace ResizeHandleDragBeginEvent {
    export interface Detail { }
}
/**
 * Emitted when the resize handle is dropped (by releasing the mouse)
 */
export type ResizeHandleDragEndEvent = CustomEvent<ResizeHandleDragEndEvent.Detail>;
export namespace ResizeHandleDragEndEvent {
    export interface Detail { }
}

/**
 * Emitted while the resize handle is being moved/dragged
 */
export type ResizeHandleMovedEvent = CustomEvent<ResizeHandleMovedEvent.Detail>;
export namespace ResizeHandleMovedEvent {
    export interface Detail {
        // The number of pixels moved on the X axis since the beginning of the drag
        readonly deltaX: number,
    }
}

@customElement("listwindow-resize-handle")
export class ResizeHandleElement extends HTMLElement {
    private static readonly STYLES = createCss({
        ":host": {
            position: "absolute",
            right: 0,
            top: "4px",
            bottom: "4px",
            width: "6px",
        },
        div: {
            width: "100%",
            height: "100%",
            cursor: "ew-resize",
            "border-right": "1px solid var(--vscode-editor-inactiveSelectionBackground)",
            transition: "border-right .1s ease-out",
            "user-select": "none",
            "box-sizing": "border-box",
        },
        "div:hover, div.being-moved": {
            "border-right": "2px solid var(--vscode-sash-hoverBorder)",
        },
    });

    private handle: HTMLElement | undefined = undefined;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(ResizeHandleElement.STYLES);

        this.handle = document.createElement("div");
        shadow.appendChild(this.handle);

        this.handle.onmousedown = (downEv: MouseEvent) => {
            if (downEv.button !== 0) {
                return;
            }
            this.handle?.classList.add("being-moved");

            this.dispatchEvent(createCustomEvent("resize-handle-drag-begin", {
                detail: {},
                bubbles: true,
                composed: true,
            }));

            // Using this when registering event handlers lets us remove them
            // all at once when we're done.
            const aborter = new AbortController();

            document.addEventListener(
                "mousemove",
                ev => {
                    const distance = ev.x - downEv.x;
                    this.dispatchEvent(
                        createCustomEvent("resize-handle-moved", {
                            detail: {
                                deltaX: distance,
                            },
                            bubbles: true,
                            composed: true,
                        }),
                    );
                },
                { signal: aborter.signal },
            );

            document.addEventListener(
                "mouseup",
                () => {
                    this.handle?.classList.remove("being-moved");
                    // Removes all event handlers
                    aborter.abort();

                    this.dispatchEvent(
                        createCustomEvent("resize-handle-drag-end", {
                            detail: {},
                            bubbles: true,
                            composed: true,
                        }),
                    );
                },
                { signal: aborter.signal },
            );
        };
    }
}
