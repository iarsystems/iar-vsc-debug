/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Column, DragDropFeedback, ListSpec, Row, SelRange } from "iar-vsc-common/thrift/bindings/listwindow_types";

/**
 * This file defines the "protocol" used between a listwindow and the view
 * provider running in the extension. Note that all message types must be
 * JSON-serializable (the Int64 type used by thrift is NOT JSON-serializable).
 */

/**
 * Everything needed to render a listwindow
 */
export interface RenderParameters {
    rows: Row[];
    listSpec: ListSpec;
    columnInfo: Column[];
    selection: SelRange;
    selectedColumn: number;
    dropFeedback: DragDropFeedback;
}

/**
 * A message from the extension to the listwindow view
 */
export type ExtensionMessage =
  { subject: "render", params: RenderParameters }; // Render the given data

/**
 * A message from the listwindow view to the extension
 */
export type ViewMessage =
  { subject: "loaded" }; // Sent when the view has been initialized
