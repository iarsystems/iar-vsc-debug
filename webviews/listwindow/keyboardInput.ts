/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MessageService } from "../shared/messageService";
import { KeyNavOperation, ScrollOperation } from "../shared/thrift/listwindow_types";

/**
 * Listens for "global" keyboard input, such as pressing the arrow keys to
 * navigate, and sends the appropriate messages to the backend.
 */
export namespace KeyboardInput {
    // eslint-disable-next-line prefer-const
    export let onCellEditRequested: (() => void) | undefined = undefined;

    /**
     * Initialized the keyboard listener
     * @param messageService The service to send key input messages to
     * @param getRangeOfVisibleRows A function providing the index of the first and last visible rows in the view.
     */
    export function initialize(messageService: MessageService) {
        document.body.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                const scrollOp = keyToScrollOp(ev.key);
                if (scrollOp !== undefined) {
                    messageService.sendMessage({
                        subject: "scrollOperationPressed",
                        operation: scrollOp,
                    });
                    ev.preventDefault();
                    return;
                }
            }

            const keyNavOp = keyToNavigationOp(ev.key);
            if (keyNavOp !== undefined) {
                messageService.sendMessage({
                    subject: "keyNavigationPressed",
                    operation: keyNavOp,
                });
                ev.preventDefault();
                return;
            }

            if (ev.key === "Insert") {
                onCellEditRequested?.();
                return;
            }

            let keyCode: number | undefined = undefined;
            if (ev.key.length === 1) {
                keyCode = ev.key.charCodeAt(0);
            } else {
                // Some special keys have an ascii representation which we can send.
                switch (ev.code) {
                    case "Delete":
                        keyCode = 0x7f;
                        break;
                    case "Backspace":
                        keyCode = 0x08;
                        break;
                    case "Enter":
                        keyCode = 0x0a;
                        break;
                    case "Tab":
                        keyCode = 0x09;
                        break;
                }
            }
            if (keyCode !== undefined) {
                messageService.sendMessage({
                    subject: "keyPressed",
                    code: keyCode,
                    repeat: 1,
                });
            }
        });
    }

    function keyToNavigationOp(key: string): KeyNavOperation | undefined {
        switch (key) {
            case "ArrowUp":
                return KeyNavOperation.kPrevItem;
            case "ArrowDown":
                return KeyNavOperation.kNextItem;
            case "ArrowLeft":
                return KeyNavOperation.kPrevLeft;
            case "ArrowRight":
                return KeyNavOperation.kNextRight;
            case "Home":
                return KeyNavOperation.kTopItem;
            case "End":
                return KeyNavOperation.kBottomItem;
            case "PageUp":
                return KeyNavOperation.kPrevItemPage;
            case "PageDown":
                return KeyNavOperation.kNextItemPage;
            default:
                return undefined;
        }
    }

    function keyToScrollOp(key: string): ScrollOperation | undefined {
        switch (key) {
            case "ArrowUp":
                return ScrollOperation.kScrollLineUp;
            case "ArrowDown":
                return ScrollOperation.kScrollLineDown;
            case "Home":
                return ScrollOperation.kScrollTop;
            case "End":
                return ScrollOperation.kScrollBottom;
            case "PageUp":
                return ScrollOperation.kScrollPageUp;
            case "PageDown":
                return ScrollOperation.kScrollPageDown;
            default:
                return undefined;
        }
    }
}