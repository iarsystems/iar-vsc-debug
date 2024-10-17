/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { customElement } from "../../../shared/utils";

export enum CellBorderVariables {
    Style = "--cell-border-style",
    // If unset, these default to 'Style'
    StyleTop = "--cell-border-style-top",
    StyleRight = "--cell-border-style-right",
    StyleBottom = "--cell-border-style-bottom",
    StyleLeft = "--cell-border-style-left",

    ColorTop = "--cell-border-color-top",
    ColorRight = "--cell-border-color-right",
    ColorBottom = "--cell-border-color-bottom",
    ColorLeft = "--cell-border-color-left",
}

/**
 * Places borders on the inside of its parent element without affecting the size
 * of the element. Like CSS outline with a negative outline-offset, but the and
 * style color of each side can be controlled individually by setting the
 * variables above.
 */
@customElement("listwindow-cell-borders")
export class CellBordersElement extends HTMLElement {
    connectedCallback() {
        this.classList.add(Styles.self);
    }
}

namespace Styles {
    export const self = css({
        pointerEvents: "none",
        position: "absolute",
        inset: 0,
        borderWidth: "1px",
        borderTopColor:    `var(${CellBorderVariables.ColorTop},    rgba(0, 0, 0, 0))`,
        borderRightColor:  `var(${CellBorderVariables.ColorRight},  rgba(0, 0, 0, 0))`,
        borderBottomColor: `var(${CellBorderVariables.ColorBottom}, rgba(0, 0, 0, 0))`,
        borderLeftColor:   `var(${CellBorderVariables.ColorLeft},   rgba(0, 0, 0, 0))`,
        borderTopStyle:    `var(${CellBorderVariables.StyleTop},    var(${CellBorderVariables.Style}, none))`,
        borderRightStyle:  `var(${CellBorderVariables.StyleRight},  var(${CellBorderVariables.Style}, none))`,
        borderBottomStyle: `var(${CellBorderVariables.StyleBottom}, var(${CellBorderVariables.Style}, none))`,
        borderLeftStyle:   `var(${CellBorderVariables.StyleLeft},   var(${CellBorderVariables.Style}, none))`,
    });
}