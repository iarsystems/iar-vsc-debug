/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


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

    const BASE_STYLES = createCssFromVars<Required<VariableDefinitions>>({
        [Variables.ListSelectionBg]:
            "var(--vscode-list-activeSelectionBackground)",
        [Variables.ListSelectionFg]:
            "var(--vscode-list-activeSelectionForeground)",
        [Variables.ListSelectionOutlineColor]:
            "var(--vscode-list-focusOutline)",
        [Variables.ListSelectionOutlineStyle]:
            "solid",
        [Variables.IndentGuideColor]:
            "var(--vscode-tree-indentGuidesStroke)",
        [Variables.GridLineColor]:
            "rgba(0, 0, 0, 0)",
        [Variables.GridLineStyle]:
            "none",
    });

    // Applied when the view is not in focus
    const UNFOCUSED_STYLES = createCssFromVars({
        [Variables.ListSelectionBg]:
            "var(--vscode-list-inactiveSelectionBackground)",
        [Variables.ListSelectionFg]:
            "var(--vscode-list-inactiveSelectionForeground)",
        [Variables.ListSelectionOutlineColor]:
            "var(--vscode-contrastActiveBorder, var(--vscode-list-inactiveFocusOutline, rgba(0, 0, 0, 0)))",
        [Variables.ListSelectionOutlineStyle]:
            "dotted",
        [Variables.IndentGuideColor]:
            "var(--vscode-tree-inactiveIndentGuidesStroke)",
    });

    // Applied when 'showGrid' is enabled in the ListSpec
    const GRID_LINES_VISIBLE_STYLES = createCssFromVars({
        [Variables.GridLineColor]:
            "var(--vscode-widget-border)",
        [Variables.GridLineStyle]:
            "solid",
    });

    export function initialize() {
        document.adoptedStyleSheets.push(BASE_STYLES);
        document.adoptedStyleSheets.push(UNFOCUSED_STYLES);
        document.adoptedStyleSheets.push(GRID_LINES_VISIBLE_STYLES);
    }

    export function setViewHasFocus(hasFocus: boolean) {
        UNFOCUSED_STYLES.disabled = hasFocus;
    }

    export function setGridLinesVisible(visible: boolean) {
        GRID_LINES_VISIBLE_STYLES.disabled = !visible;
    }

    type VariableDefinitions = { [K in Variables]?: string };

    function createCssFromVars<T extends VariableDefinitions>(vars: T): CSSStyleSheet {
        let css = "body {";
        for (const key in vars) {
            const varName = key as keyof typeof vars;
            css += `${String(varName)}: ${vars[varName]};`;
        }
        css += "}";
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        return sheet;
    }
}
