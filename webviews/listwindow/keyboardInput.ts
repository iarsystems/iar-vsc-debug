/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MessageService } from "./messageService";
import { KeyNavOperation, ScrollOperation } from "./thrift/listwindow_types";

/**
 * Listens for "global" keyboard input, such as pressing the arrow keys to
 * navigate, and sends the appropriate messages to the backend.
 */
export namespace KeyboardInput {
    export function initialize(messageService: MessageService) {
        document.body.addEventListener("keydown", ev => {
            if (ev.ctrlKey) {
                const scrollOp = keyToScrollOp(ev.key);
                if (scrollOp !== undefined) {
                    messageService.sendMessage({
                        subject: "scrollOperationPressed",
                        operation: scrollOp,
                    });
                    return;
                }
            }

            const keyNavOp = keyToNavigationOp(ev.key);
            if (keyNavOp !== undefined) {
                messageService.sendMessage({
                    subject: "keyNavigationPressed",
                    operation: keyNavOp,
                });
                return;
            }

            // TODO: handle insert
            // TODO: handle arbitrary keypresses

            ev.preventDefault();
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