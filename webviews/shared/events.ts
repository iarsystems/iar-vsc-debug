/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    CellEditRequestedEvent,
    CellHoveredEvent,
    CellRightClickedEvent,
} from "../listwindow/rendering/cell/cell";
import { ContextMenuItemClickEvent } from "../listwindow/rendering/contextMenuService";
import { ColumnsResizedEvent } from "../listwindow/rendering/header/header";
import {
    ResizeHandleDragBeginEvent,
    ResizeHandleDragEndEvent,
    ResizeHandleMovedEvent,
} from "../listwindow/rendering/header/resizeHandle";
import {
    ToolbarItemEvent,
    ToolbarItemHoveredEvent,
} from "./rendering/toolbar/toolbarItem";

/**
 * Defines custom DOM events ({@link CustomEvent})s available in the view, each
 * with a name and the type of the event's `detail` field.
 */
interface CustomEventTypeMap {
    "resize-handle-drag-begin": ResizeHandleDragBeginEvent.Detail;
    "resize-handle-drag-end": ResizeHandleDragEndEvent.Detail;
    "resize-handle-moved": ResizeHandleMovedEvent.Detail;
    "columns-resized": ColumnsResizedEvent.Detail;
    "cell-hovered": CellHoveredEvent.Detail;
    "cell-edit-requested": CellEditRequestedEvent.Detail;
    "cell-edit-submitted": string,
    "cell-right-clicked": CellRightClickedEvent.Detail;
    "context-menu-item-clicked": ContextMenuItemClickEvent.Detail;
    "toolbar-item-interaction": ToolbarItemEvent.Detail;
    "toolbar-item-hovered": ToolbarItemHoveredEvent.Detail;
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
