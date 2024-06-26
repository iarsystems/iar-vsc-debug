/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css, unsafeCSS } from "lit";
import { Alignment } from "../thrift/listwindow_types";

// Classes and related styles that are shared across components. Make sure to
// export all styles at the bottom of the file.

// A cell in the grid with "showGrid" enabled
export const CLASS_GRID_ELEMENT = "grid-element";
const STYLE_GRID_ELEMENT = css`
    .${unsafeCSS(CLASS_GRID_ELEMENT)} {
        border-right: 1px solid var(--vscode-widget-border);
        border-bottom: 1px solid var(--vscode-widget-border);
    }
`;

/**
 * Classes corresponding to the thrift {@link Alignment}s, that describe how to
 * align cell text.
 */
export enum AlignmentClass {
    Left = "alignment-left",
    Right = "alignment-right",
    Center = "alignment-center",
}
export function alignmentToClass(alignment: Alignment): AlignmentClass {
    switch (alignment) {
        case Alignment.kLeft:
            return AlignmentClass.Left;
        case Alignment.kRight:
            return AlignmentClass.Right;
        case Alignment.kCenter:
            return AlignmentClass.Center;
    }
}
export const STYLE_THRIFT_ALIGNMENT = css`
    .${unsafeCSS(AlignmentClass.Left)} {
        text-align: left;
    }
    .${unsafeCSS(AlignmentClass.Right)} {
        text-align: right;
    }
    .${unsafeCSS(AlignmentClass.Center)} {
        text-align: center;
    }
`;


export const SHARED_STYLES = [
    STYLE_GRID_ELEMENT,
    STYLE_THRIFT_ALIGNMENT,
];
