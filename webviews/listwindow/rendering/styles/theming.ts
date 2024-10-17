/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";


/**
 * Performs context-dependent theming of the view (such as changing some colors
 * when the view is not in focus). This is done via CSS variables, since they
 * pierce shadow DOMs. Individual components opt into the theming by using the
 * variables in their styles.
 */
export namespace Theming {
    /**
     * Names of CSS variables which are set based on context.
     */
    export enum Variables {
        ListSelectionBg = "--list-selection-background",
        ListSelectionFg = "--list-selection-color",
        ListSelectionOutlineColor = "--list-selection-outline-color",
        ListSelectionOutlineStyle = "--list-selection-outline-style",
        IndentGuideColor = "--indent-guide-color",
        GridLineColor = "--grid-line-color",
        GridLineStyle = "--grid-line-style",
    }

    const BASE_STYLES = css([
        {
            [Variables.ListSelectionBg]:
                "var(--vscode-list-activeSelectionBackground)",
            [Variables.ListSelectionFg]:
                "var(--vscode-list-activeSelectionForeground)",
            [Variables.ListSelectionOutlineColor]:
                "var(--vscode-list-focusOutline)",
            [Variables.ListSelectionOutlineStyle]: "solid",
            [Variables.IndentGuideColor]:
                "var(--vscode-tree-inactiveIndentGuidesStroke)",
            [Variables.GridLineColor]: "transparent",
            [Variables.GridLineStyle]: "none",
        },
        css`
            &:hover {
                ${Variables.IndentGuideColor}: var(--vscode-tree-indentGuidesStroke);
            }
        `,
    ]);

    // Applied when the view is not in focus
    const UNFOCUSED_STYLES = css({
        [Variables.ListSelectionBg]:
            "var(--vscode-list-inactiveSelectionBackground)",
        [Variables.ListSelectionFg]:
            "var(--vscode-list-inactiveSelectionForeground)",
        [Variables.ListSelectionOutlineColor]:
            "var(--vscode-contrastActiveBorder, var(--vscode-list-inactiveFocusOutline, transparent))",
        [Variables.ListSelectionOutlineStyle]:
            "dotted",
    });

    // Applied when 'showGrid' is enabled in the ListSpec
    const GRID_LINES_VISIBLE_STYLES = css({
        [Variables.GridLineColor]:
            "var(--vscode-widget-border, var(--vscode-sideBar-border, var(--vscode-editorWidget-border, var(--vscode-panel-border, var(--vscode-list-deemphasizedForeground, transparent)))))",
        [Variables.GridLineStyle]:
            "solid",
    });

    export function initialize() {
        document.body.classList.add(BASE_STYLES);
    }

    export function setViewHasFocus(hasFocus: boolean) {
        if (hasFocus) {
            document.body.classList.remove(UNFOCUSED_STYLES);
        } else {
            document.body.classList.add(UNFOCUSED_STYLES);
        }
    }

    export function setGridLinesVisible(visible: boolean) {
        if (visible) {
            document.body.classList.add(GRID_LINES_VISIBLE_STYLES);
        } else {
            document.body.classList.remove(GRID_LINES_VISIBLE_STYLES);
        }
    }
}
