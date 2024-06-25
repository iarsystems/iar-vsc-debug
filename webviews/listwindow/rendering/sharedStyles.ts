/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css, unsafeCSS } from "lit";

// Classes and related styles that are shared across components

// A cell in the grid with "showGrid" enabled
export const CLASS_GRID_ELEMENT = "grid-element";
const STYLE_GRID_ELEMENT = css`
    .${unsafeCSS(CLASS_GRID_ELEMENT)} {
        border-right: 1px solid var(--vscode-widget-border);
        border-bottom: 1px solid var(--vscode-widget-border);
    }
`;

export const SHARED_STYLES = [
    STYLE_GRID_ELEMENT,
];
