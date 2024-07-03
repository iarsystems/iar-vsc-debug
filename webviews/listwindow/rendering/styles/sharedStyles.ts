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
    export const STYLE_THRIFT_ALIGNMENT: CSSStyleSheet = createCss({
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

    export const STYLES = [STYLE_THRIFT_ALIGNMENT];
}
