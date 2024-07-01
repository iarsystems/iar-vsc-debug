/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Alignment } from "../thrift/listwindow_types";
import * as CSS from "csstype";

/**
 * Utilities for creating and applying styles, as well as some shared styles
 * that are used in multiple components
 */
export namespace Styles {
    /**
     * A collection of style rule definitions. Use {@link toCss} to
     * convert this to something usable.
     */
    export interface StyleRules {
        [selector: string]: CSS.PropertiesHyphen;
    }

    /**
     * Converts our custom {@link StyleRules} to a {@link CSSStyleSheet}, which can
     * be added as an adopted style sheet to a shadow DOM.
     */
    export function toCss(
        styles: StyleRules | StyleRules[],
    ): CSSStyleSheet {
        if (!Array.isArray(styles)) {
            styles = [styles];
        }
        // We need to convert the styles to css so that they can be parsed by the CSSStyleSheet
        let css = "";
        for (const style of styles) {
            for (const selector in style) {
                css += selector + " {";
                const properties = style[selector];
                for (const prop in properties) {
                    css += `${prop}: ${properties[prop as keyof typeof properties]};`;
                }
                css += "}";
            }
        }
        const styleSheet = new CSSStyleSheet();
        styleSheet.replaceSync(css);
        return styleSheet;
    }


    // Classes and related styles that are shared across components. Make sure to
    // export all styles at the bottom of the file.

    /**
     *  Class set on the table element when the listwindow has focus (to allow
     *  child elements to style themselves accordingly).
     */
    export const CLASS_VIEW_FOCUSED = "view-has-focus";

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
    export const STYLE_THRIFT_ALIGNMENT: StyleRules = {
        ["." + AlignmentClass.Left]: {
            "text-align": "left",
        },
        ["." + AlignmentClass.Right]: {
            "text-align": "right",
        },
        ["." + AlignmentClass.Center]: {
            "text-align": "center",
        },
    };

    export const SHARED_STYLES = [STYLE_THRIFT_ALIGNMENT];
}
