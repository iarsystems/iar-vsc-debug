/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { Alignment } from "../../thrift/listwindow_types";
import { createCss } from "./createCss";

/**
 * Classes, styles and CSS variables that are shared across components.
 */
export namespace SharedStyles {
    //! NOTE: Make sure to export all styles at the bottom of the file.

    // "z-index" values used by various elements. By defining them in one place,
    // it's easier to get an overview of how the elements stack.
    export enum ZIndices {
        GridHeader = 1,
        Tooltip = 2,
    }

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
    const STYLE_THRIFT_ALIGNMENT = createCss({
        ["." + AlignmentClass.Left]: {
            "text-align": "left",
        },
        ["." + AlignmentClass.Right]: {
            "text-align": "right",
        },
        ["." + AlignmentClass.Center]: {
            "text-align": "center",
        },
    });

    // The style sheet for the "codicons" icon package:
    // https://github.com/microsoft/vscode-codicons
    // This must be adopted into shadow DOMs wherever we need the icons
    let codiconsCss: CSSStyleSheet | undefined = undefined;
    for (const styleSheet of document.styleSheets) {
        if (styleSheet.href?.endsWith("codicon.css")) {
            let css = "";
            for (const rule of styleSheet.cssRules) {
                css += rule.cssText;
            }
            const copy = new CSSStyleSheet();
            copy.replaceSync(css);
            codiconsCss = copy;
            break;
        }
    }

    export const STYLES: CSSStyleSheet[] = [STYLE_THRIFT_ALIGNMENT];
    if (codiconsCss) {
        STYLES.push(codiconsCss);
    }
}
