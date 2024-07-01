/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MenuItem } from "./thrift/listwindow_types";
import { Column, DragDropFeedback, ListSpec, Row, SelRange, SelectionFlags } from "./thrift/listwindow_types";

/**
 * This file defines the "protocol" used between a listwindow and the view
 * provider running in the extension. Note that all message types must be
 * JSON-serializable (the Int64 type used by thrift is NOT JSON-serializable).
 */

/**
 * Everything needed to render a listwindow
 */
// TODO: The thrift types are not fully serializable (e.g. Int64 is problematic)
export interface RenderParameters {
    rows: Row[];
    listSpec: ListSpec;
    columnInfo: Column[];
    selection: SelRange;
    selectedColumn: number;
    dropFeedback: DragDropFeedback;
}

/**
 * Controls whether to auto-fill the grid to the width of the view, see the
 * "Fit contents to view width" setting.
 */
export type ColumnResizeMode = "fit" | "fixed";

/**
 * A message from the extension to the listwindow view
 */
export type ExtensionMessage =
  | { subject: "render", params: RenderParameters } // Render the given data
  | { subject: "setResizeMode", mode: ColumnResizeMode }
  | { subject: "dumpHTML" } // Send a message back with the current full HTML of the view (useful for testing)
  | { subject: "contextMenuReply", menu: MenuItem[] };

/**
 * A message from the listwindow view to the extension
 */
export type ViewMessage =
  | { subject: "loaded" } // Sent when the view has been initialized
  | { subject: "HTMLDump", html: string } // Response to a dumpHTML message, contains the full HTML of the view
  | { subject: "cellLeftClicked", col: number, row: number, flags: SelectionFlags }
  | { subject: "cellDoubleClicked", col: number, row: number }
  | { subject: "getContextMenu", col: number, row: number }; // The user right-clicked a cell. The extension should reply with "context-menu-reply"
