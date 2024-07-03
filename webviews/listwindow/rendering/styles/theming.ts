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
        ListSelectionOutline = "--list-selection-outline",
    }

    const BASE_STYLES = createCssFromVars<Required<VariableDefinitions>>({
        [Variables.ListSelectionBg]:
            "var(--vscode-list-activeSelectionBackground)",
        [Variables.ListSelectionFg]:
            "var(--vscode-list-activeSelectionForeground)",
        [Variables.ListSelectionOutline]:
            "var(--vscode-list-focusOutline)",
    });
    const UNFOCUSED_STYLES = createCssFromVars({
        [Variables.ListSelectionBg]:
            "var(--vscode-list-inactiveSelectionBackground)",
        [Variables.ListSelectionFg]:
            "var(--vscode-list-inactiveSelectionForeground)",
        [Variables.ListSelectionOutline]:
            "var(--vscode-contrastActiveBorder, var(--vscode-list-inactiveFocusOutline, rgba(0, 0, 0, 0)))",
    });

    export function initialize() {
        document.adoptedStyleSheets.push(BASE_STYLES);
        document.adoptedStyleSheets.push(UNFOCUSED_STYLES);
    }

    export function setViewHasFocus(hasFocus: boolean) {
        UNFOCUSED_STYLES.disabled = hasFocus;
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
