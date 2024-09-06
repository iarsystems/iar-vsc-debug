/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { EditInfo, KeyNavOperation, ScrollOperation } from "./thrift/listwindow_types";
import { MenuItem } from "./thrift/listwindow_types";
import { Column, ListSpec, Row, SelRange, SelectionFlags } from "./thrift/listwindow_types";

/**
 * This file defines the "protocol" used between a listwindow and the view
 * provider running in the extension.
 */

// eslint-disable-next-line @typescript-eslint/ban-types
type Unserializable = Function | bigint | symbol;
/**
 * Recursively strips everything that is not JSON-serializable from T (most
 * notable all functions/methods). This is to let us use thrift types in the
 * protocol while ensuring that we do not use any functions that do not exist
 * on the deserialized objects.
 */
export type Serializable<T> = T extends (infer U)[]
    ? Serializable<U>[]
    : T extends object
        ? { [K in keyof T as T[K] extends Unserializable ? never : K]: Serializable<T[K]> }
        : T;

/**
 * Everything needed to render a listwindow
 */
export type RenderParameters = Serializable<{
    rows: Row[];
    listSpec: ListSpec;
    columnInfo: Column[];
    selection: SelRange[];
    frozen: boolean;
    scrollInfo: {
        // The index of the first row
        offset: SerializedBigInt;
        fractionInWin: number;
        fractionBefore: number;
        fractionAfter: number;
    }
}>;


/**
 * Controls whether to auto-fill the grid to the width of the view, see the
 * "Fit contents to view width" setting.
 */
export type ColumnResizeMode = "fit" | "fixed";

/**
 * Since bigint is not JSON-serializable, we need to send it as a string. The
 * value can be parsed using BigInt(mySerializedBigint.value)
 */
export interface SerializedBigInt { value: string }

/**
 * A message from the extension to the listwindow view
 */
export type ExtensionMessage =
  | { subject: "render", params: RenderParameters, ensureRowVisible?: SerializedBigInt } // Render the given data
  | { subject: "renderToolbar", params: string} // Render the given data
  | { subject: "setResizeMode", mode: ColumnResizeMode }
  | { subject: "dumpHTML" } // Send a message back with the current full HTML of the view (useful for testing)
  | { subject: "contextMenuReply", menu: Serializable<MenuItem>[] }
  | { subject: "tooltipReply", text?: string }
  | { subject: "editableStringReply", info: Serializable<EditInfo>, col: number, row: SerializedBigInt };

/**
 * A message from the listwindow view to the extension
 */
export type ViewMessage =
  | { subject: "loaded" } // Sent when the view has been initialized
  | { subject: "rendered" } // Sent when done with a render message, useful for testing
  | { subject: "HTMLDump", html: string } // Response to a dumpHTML message, contains the full HTML of the view
  | { subject: "viewportChanged", firstRow: SerializedBigInt, lastRow: SerializedBigInt } // The user has scrolled or resize the view
  | { subject: "columnClicked", col: number }
  | { subject: "cellLeftClicked", col: number, row: SerializedBigInt, flags: SelectionFlags }
  | { subject: "cellDoubleClicked", col: number, row: SerializedBigInt }
  | { subject: "getContextMenu", col: number, row: SerializedBigInt } // The user right-clicked a cell. The extension should reply with "contextMenuReply"
  | { subject: "getTooltip", col: number, row: SerializedBigInt } // The user is hovering a cell. The extension should reply with "tooltipReply"
  | { subject: "rowExpansionToggled", row: SerializedBigInt } // The user pressed an 'expand' or 'collapse' button
  | { subject: "moreLessToggled", row: SerializedBigInt } // The user pressed a 'more' or 'less' siblings button
  | { subject: "checkboxToggled", row: SerializedBigInt }
  // The user wants to edit a cell, reply with "editableStringReply" using the value that should be shown in the text field
  | { subject: "getEditableString", col: number, row: SerializedBigInt }
  | { subject: "cellEdited", col: number, row: SerializedBigInt, newValue: string } // The user has changed the value of a cell
  | { subject: "localDrop", srcCol: number, srcRow: SerializedBigInt, dstCol: number, dstRow: SerializedBigInt } // The user dropped the cell srcCol/srcRow at dstCol/dstRow
  | { subject: "externalDrop", col: number, row: SerializedBigInt, droppedText: string } // The user dropped some text at the given position
  | { subject: "contextItemClicked", command: number } // The user clicked a context menu item
  | { subject: "keyNavigationPressed", operation: KeyNavOperation, rowsInPage: number }
  | { subject: "scrollOperationPressed", operation: ScrollOperation, firstRow: SerializedBigInt, lastRow: SerializedBigInt }
  | { subject: "keyPressed", code: number, repeat: number }
  | { subject: "toolbarRendered" } // The user has clicked on an item the toolbar.
  | { subject: "toolbarItemInteraction", id: string, properties: string } // The user has interacted with a toolbar item.
  | { subject: "getToolbarToolTip", id: string }; // The user is hovering a toolbar item.


/**
 * Helper for selecting a specific variant of {@link ViewMessage}, e.g.
 * ViewMessageVariant<"columnClicked"> === { subject: "columnClicked", col: number }
 *
 * Uses distributive conditional types to "iterate" over the variants, and a
 * helper with a regular conditional type to choose the right variant:
 * https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
export type ViewMessageVariant<
    Subject extends ViewMessage["subject"],
    Message extends ViewMessage = ViewMessage,
> = Message extends unknown ? PickVariant<Message, Subject> : never;

type PickVariant<
    T extends ViewMessage,
    Subject extends ViewMessage["subject"],
> = T["subject"] extends Subject ? T : never;