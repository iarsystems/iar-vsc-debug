/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { createCustomEvent } from "../events";

/**
 * Emitted when the resize handle is moved/dragged
 */
export type ResizeHandleMovedEvent = CustomEvent<ResizeHandleDroppedEvent.Detail>;
export namespace ResizeHandleMovedEvent {
    export interface Detail {
        // The number of pixels moved on the X axis
        readonly deltaX: number,
    }
}

/**
 * Emitted when the resize handle is dropped (by releasing the mouse)
 */
export type ResizeHandleDroppedEvent = CustomEvent<ResizeHandleDroppedEvent.Detail>;
export namespace ResizeHandleDroppedEvent {
    export interface Detail { }
}

@customElement("listwindow-resize-handle")
export class ResizeHandleElement extends LitElement {
    static override styles = css`
        :host {
            position: absolute;
            right: 0;
            top: 4px;
            bottom: 4px;
            width: 6px;
        }
        div {
            width: 100%;
            height: 100%;
            cursor: ew-resize;
            border-right: 1px solid var(--vscode-editor-inactiveSelectionBackground);
            transition: border-right .1s ease-out;
            user-select: none;
        }
        div:hover {
            border-right: 2px solid var(--vscode-sash-hoverBorder);
        }
    `;

    override render() {
        const startDrag = (downEv: MouseEvent) => {
            if (downEv.button !== 0) {
                return;
            }
            let lastX = downEv.x;
            const onMove = (ev: MouseEvent) => {
                const distance = ev.x - lastX;
                lastX = ev.x;
                const event = createCustomEvent("resize-handle-moved", {
                    detail: {
                        deltaX: distance,
                    },
                    bubbles: true,
                    composed: true,
                });
                this.dispatchEvent(event);
            };
            document.addEventListener("mousemove", onMove);

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onMouseUp);

                const event = createCustomEvent("resize-handle-dropped", {
                    detail: {},
                    bubbles: true,
                    composed: true,
                });
                this.dispatchEvent(event);
            };
            document.addEventListener("mouseup", onMouseUp);
        };

        return html`<div @mousedown=${startDrag}></div>`;
    }
}