/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MessageService } from "../messageService";
import { CellHoveredEvent } from "./cell/cell";
import { SharedStyles } from "./styles/sharedStyles";
import { customElement } from "./utils";
import { css } from "@emotion/css";
import * as FloatingUi from "@floating-ui/dom";

interface PendingTooltip {
    position: { x: number, y: number},
    fallbackText: string | undefined,
}

/**
 * Allows opening tooltips and closes them automatically when appropriate (e.g.
 * when the mouse is moved). Since tooltip text usually has to be fetched from
 * the backend, this class keeps track of "pending" tooltip that are awaiting
 * resolved text.
 */
export class TooltipService {
    private element: TooltipElement | undefined = undefined;
    private pendingTooltip: PendingTooltip | undefined = undefined;

    constructor(private readonly messageService: MessageService) {
        messageService.addMessageHandler(reply => {
            if (reply.subject === "tooltipReply") {
                this.setTextForPendingTooltip(reply.text);
            }
        });
    }

    requestTooltip(event: CellHoveredEvent) {
        const fallbackText = event.detail.cellContent.isTruncated
            ? event.detail.cellContent.text
            : undefined;
        this.pendingTooltip = {
            position: event.detail.hoverPosition,
            fallbackText,
        };
        document.addEventListener("mousemove", this.clearTooltip);
        this.messageService.sendMessage({
            subject: "getTooltip",
            col: event.detail.col,
            row: event.detail.row,
        });
    }

    private setTextForPendingTooltip(text: string | undefined) {
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = undefined;
        }

        if (this.pendingTooltip) {
            const tooltipText = text ?? this.pendingTooltip.fallbackText;
            if (tooltipText) {
                this.element = new TooltipElement();
                this.element.tooltipText = tooltipText;
                this.element.position = this.pendingTooltip.position;
                document.body.appendChild(this.element);
            }
        }

        this.pendingTooltip = undefined;
    }

    private readonly clearTooltip = () => {
        document.removeEventListener("mousemove", this.clearTooltip);
        if (this.pendingTooltip) {
            this.pendingTooltip = undefined;
        }
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = undefined;
        }
    };
}

@customElement("listwindow-tooltip")
class TooltipElement extends HTMLElement {
    tooltipText = "";
    position?: {
        x: number;
        y: number;
    };

    connectedCallback() {
        this.classList.add(Styles.self);

        if (!this.position) {
            return;
        }

        this.textContent = this.tooltipText;

        // Note that we cannot render the tooltip outside the view bounds (as a
        // "floating" window). It would just create a scrollbar.
        // Thus, we use the FloatingUI library to position & size the tooltip.

        // The padding between the tooltip and the view edges
        const padding = 5;
        // Position the tooltip around a box with the same position and
        // (roughly) size as the mouse cursor, so that the cursor doesn't block
        // the tooltip.
        const pos = this.position;
        const cursorElem: FloatingUi.VirtualElement = {
            getBoundingClientRect: () => {
                return {
                    width: 25,
                    height: 25,
                    x: pos.x,
                    y: pos.y,
                    left: pos.x,
                    top: pos.y,
                    right: pos.x + 25,
                    bottom: pos.y + 25,
                };
            },
        };
        FloatingUi.computePosition(cursorElem, this, {
            placement: "bottom-start",
            middleware: [
                FloatingUi.shift({ padding }),
                FloatingUi.flip({ padding }),
                FloatingUi.size({
                    padding,
                    apply({ availableWidth, availableHeight, elements }) {
                        Object.assign(elements.floating.style, {
                            maxWidth: `${availableWidth}px`,
                            maxHeight: `${availableHeight}px`,
                        });
                    },
                }),
            ],
        }).then(({ x, y }) => {
            Object.assign(this.style, {
                left: `${x}px`,
                top: `${y}px`,
            });

            // Fade in the tooltip
            this.style.opacity = "1";
        });
    }
}

namespace Styles {
    export const self = css({
        position: "absolute",
        top: 0,
        left: 0,
        width: "max-content",
        transition: "opacity 0.1s ease-in-out",
        opacity: 0,
        zIndex: SharedStyles.ZIndices.Tooltip,
        background: "var(--vscode-editorHoverWidget-background)",
        color: "var(--vscode-editorHoverWidget-foreground)",
        border: "1px solid var(--vscode-editorHoverWidget-border)",
        boxSizing: "border-box",
        padding: "4px 8px",
        // Render white-space/newlines as-is
        whiteSpace: "pre-wrap",
    });
}