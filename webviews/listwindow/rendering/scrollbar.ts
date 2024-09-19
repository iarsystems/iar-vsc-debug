/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { MessageService } from "../messageService";
import { customElement } from "./utils";

/**
 * A vertical scrollbar for a listwindow. This doesn't actually perform any
 * scrolling of the window content (with the DOM scrolling APIs), but instead
 * sends messages to the view provider in the extension code to scroll the
 * listwindow.
 */
@customElement("listwindow-scrollbar")
export class ScrollbarElement extends HTMLElement {
    messageService: MessageService | undefined = undefined;

    private fractionAboveWin = 0;
    private fractionInWin = 1;

    private currentThumbDrag: { startFraction: number; startY: number } | undefined = undefined;

    constructor() {
        super();
        document.addEventListener("mousemove", ev => this.onMouseMove(ev));
        document.addEventListener("mouseup", () => this.finishThumbDrag());
        window.addEventListener("blur", () => this.finishThumbDrag());

        this.classList.add(Styles.scrollbar);

        // The thumb is the draggable part of the scrollbar that represents the
        // visible portion.
        const thumb = document.createElement("div");
        thumb.classList.add(Styles.scrollbarThumb);
        this.replaceChildren(thumb);
    }

    setSizeAndProgress(fractionAboveWin: number, fractionInWin: number) {
        this.fractionAboveWin = clamp(fractionAboveWin, 0, 1);
        this.fractionInWin = clamp(fractionInWin, 0, 1 - this.fractionAboveWin);
        const fractionAfter = 1 - this.fractionAboveWin - this.fractionInWin;

        this.style.gridTemplateRows = `${this.fractionAboveWin}fr ${this.fractionInWin}fr ${fractionAfter}fr`;
    }

    override onmousedown = (ev: MouseEvent) => {
        if (ev.target === this) {
            // mouse down on the track (outside the thumb), scroll to the
            // clicked position immediately
            const clickedFraction = ev.clientY / this.clientHeight;
            this.messageService?.sendMessage({
                subject: "absoluteScrolled",
                fraction: clamp(clickedFraction, 0, 1),
            });
        } else {
            // mouse down on the thumb, start dragging
            console.log(this.fractionAboveWin);
            this.currentThumbDrag = {
                startFraction: this.fractionAboveWin + this.fractionInWin / 2,
                startY: ev.clientY
            };
        }
    };

    private onMouseMove(ev: MouseEvent) {
        if (this.currentThumbDrag === undefined) {
            return;
        }
        const movedFraction =
            (ev.clientY - this.currentThumbDrag.startY) / this.clientHeight;
        this.messageService?.sendMessage({
            subject: "absoluteScrolled",
            fraction: clamp(this.currentThumbDrag.startFraction + movedFraction, 0, 1),
        });
    }

    private finishThumbDrag() {
        this.currentThumbDrag = undefined;
    }
}

function clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
}

namespace Styles {
    export const scrollbar = css({
        width: "10px",
        height: "100%",
        backgroundColor: "transparent",
        display: "grid",
    });
    export const scrollbarThumb = css({
        gridRow: "2",
        width: "10px",
        backgroundColor: "var(--vscode-scrollbarSlider-background)",
        minHeight: "10px",
    });
}