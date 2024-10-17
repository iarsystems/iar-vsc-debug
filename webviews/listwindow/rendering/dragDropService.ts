/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MessageService } from "../../shared/messageService";
import { SerializedBigInt } from "../../shared/protocol";
import { Target } from "../../shared/thrift/listwindow_types";
import { CellElement, CellPosition } from "./cell/cell";

/** Feedback about an in-progress (i.e. "hovering") drag */
export interface DragDropFeedback {
    target: Target;
    col: number;
    row: bigint;
}

/**
 * Information about where a drag event originated from.
 */
interface DragSource {
    windowId: string;
    col: number;
    row: SerializedBigInt;
}
// Key for the DragSource data format on the event
const DRAG_SOURCE_FORMAT = "application/listwindow-source";

/**
 * Provides drag- and drop operations for cells. While this is primarily meant for
 * dragging cells within the same listwindow, this service uses a drag
 * and drop API which is "global" for all of VS Code, meaning:
 * - Draggable cells can be dropped outside the listwindow (e.g. in the text editor)
 * - Content from outside the listwindow can be dragged onto drop zones in the listwindow
 */
export class DragDropService {

    /**
     * Called when {@link currentFeedback} changes
     */
    onFeedbackChanged: (() => void) | undefined
        = undefined;

    /** The status of the current drag operation, if any. */
    currentFeedback = DragDropFeedback.none();

    /**
     * @param windowId A unique identifier for this listwindow. Used to identify where a drop came from.
    */
    constructor(
        private readonly windowId: string,
        private readonly messageService: MessageService
    ) {}

    /**
     * Make the given cell draggable.
     */
    registerDraggableCell(elem: CellElement) {
        elem.setAttribute("draggable", "true");
        elem.ondragstart = ev => {
            if (ev.dataTransfer) {
                ev.dataTransfer.setDragImage(document.createElement("img"), 0, 0);
                // VSC-463 Ideally we would call getDrag on the backend here to
                // get the text data for the drag event. However, we aren't
                // allowed to set event data asynchronously. Instead, we provide
                // info about where the drag came from, and it's up to the
                // receiver to call getDrag in order to use the event (if the
                // receiver is a listwindow).
                const source: DragSource = {
                    windowId: this.windowId,
                    col: elem.position.col,
                    row: { value: elem.position.row.toString() },
                };
                ev.dataTransfer.setData(
                    DRAG_SOURCE_FORMAT,
                    JSON.stringify(source),
                );

                // Fallback text for when dropping somewhere that isn't a
                // listwindow (e.g. the text editor)
                ev.dataTransfer.setData("text/plain", elem.cell?.text ?? "");
            }
        };
    }

    /**
     * Register the given element as a zone that can be dropped to. Note that
     * any element can be a drop target, not just cells (e.g. the "backdrop"
     * element outside all cells).
     * @param elem The element to make droppable
     * @param position The position to report when the element is dropped to
     * @param target The target to use when rendering feedback while hovering the drop target
     */
    registerDropTarget(elem: HTMLElement, position: CellPosition, target: Target) {
        elem.ondragenter = ev => {
            ev.preventDefault();
            ev.stopPropagation();
            this.setFeedback({
                target,
                col: position.col,
                row: position.row,
            });
        };
        elem.ondragleave = ev => {
            if (ev.target instanceof Element && !ev.target.isConnected) {
                return;
            }
            this.setFeedback(DragDropFeedback.none());
        };
        elem.ondragover = ev => {
            ev.preventDefault();
        };
        elem.ondrop = ev => {
            ev.preventDefault();
            ev.stopPropagation();
            this.setFeedback(DragDropFeedback.none());

            if (ev.dataTransfer) {
                let dropText = "";
                if (ev.dataTransfer.getData(DRAG_SOURCE_FORMAT) === "") {
                    dropText = ev.dataTransfer.getData("text/plain");
                } else {
                    const source: DragSource = JSON.parse(
                        ev.dataTransfer?.getData(DRAG_SOURCE_FORMAT),
                    );
                    if (source.windowId === this.windowId) {
                        this.messageService.sendMessage({
                            subject: "localDrop",
                            srcCol: source.col,
                            srcRow: source.row,
                            dstCol: position.col,
                            dstRow: { value: position.row.toString() },
                        });
                        return;
                    } else {
                        console.error(
                            "Got drop from another listwindow. This is not yet supported, see VSC-463.",
                        );
                        dropText = ev.dataTransfer.getData("text/plain");
                    }
                }
                if (dropText !== "") {
                    this.messageService.sendMessage({
                        subject: "externalDrop",
                        col: position.col,
                        row: { value: position.row.toString() },
                        droppedText: dropText,
                    });
                }
            }
        };
    }

    private setFeedback(newFeedback: DragDropFeedback) {
        if (DragDropFeedback.equals(this.currentFeedback, newFeedback)) {
            return;
        }
        this.currentFeedback = newFeedback;
        this.onFeedbackChanged?.();
    }
}

namespace DragDropFeedback {
    export function none(): DragDropFeedback {
        return {
            target: Target.kNoTarget,
            col: -1,
            row: -1n,
        };
    }

    export function equals(f1: DragDropFeedback, f2: DragDropFeedback) {
        return f1.target === f2.target && f1.col === f2.col && f1.row === f2.row;
    }
}
