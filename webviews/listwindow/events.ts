/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    CellClickedEvent,
    CellEditRequestedEvent,
    CellHoveredEvent,
    CellRightClickedEvent,
} from "./rendering/cell/cell";
import { RowExpansionToggledEvent } from "./rendering/cell/treeInfo";
import { ColumnsResizedEvent } from "./rendering/header/header";
import {
    ResizeHandleDragBeginEvent,
    ResizeHandleDragEndEvent,
    ResizeHandleMovedEvent,
} from "./rendering/header/resizeHandle";

/**
 * Defines custom DOM events ({@link CustomEvent})s available in the view, each
 * with a name and the type of the event's `detail` field.
 */
interface CustomEventTypeMap {
    "resize-handle-drag-begin": ResizeHandleDragBeginEvent.Detail;
    "resize-handle-drag-end": ResizeHandleDragEndEvent.Detail;
    "resize-handle-moved": ResizeHandleMovedEvent.Detail;
    "columns-resized": ColumnsResizedEvent.Detail;
    "cell-clicked": CellClickedEvent.Detail;
    "cell-right-clicked": CellRightClickedEvent.Detail;
    "cell-hovered": CellHoveredEvent.Detail;
    "cell-edit-requested": CellEditRequestedEvent.Detail;
    "cell-edit-submitted": string,
    "row-expansion-toggled": RowExpansionToggledEvent.Detail;
}

type CustomEventMap = {
    [EventName in keyof CustomEventTypeMap]: CustomEvent<CustomEventTypeMap[EventName]>;
};

declare global {
    // Extending GlobalEventHandlersEventMap makes the event types available
    // in HTMLElement.addListener calls.
    interface GlobalEventHandlersEventMap extends CustomEventMap {}
}

/**
 * Typesafe helper for creating a custom event of one of the types declared
 * above.
 */
export const createCustomEvent = <T extends keyof CustomEventTypeMap>(
    type: T,
    eventInitDict: CustomEventInit<CustomEventTypeMap[T]>,
) => new CustomEvent(type, eventInitDict);
