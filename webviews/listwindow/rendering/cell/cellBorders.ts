/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCss } from "../styles/createCss";
import { customElement } from "../utils";

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
    private static readonly STYLES = createCss({
        div: {
            "pointer-events": "none",
            position: "absolute",
            inset: 0,
            "border-width": "1px",
            "border-top-color":    `var(${CellBorderVariables.ColorTop},    rgba(0, 0, 0, 0))`,
            "border-right-color":  `var(${CellBorderVariables.ColorRight},  rgba(0, 0, 0, 0))`,
            "border-bottom-color": `var(${CellBorderVariables.ColorBottom}, rgba(0, 0, 0, 0))`,
            "border-left-color":   `var(${CellBorderVariables.ColorLeft},   rgba(0, 0, 0, 0))`,
            "border-top-style":    `var(${CellBorderVariables.StyleTop},    var(${CellBorderVariables.Style}, none))`,
            "border-right-style":  `var(${CellBorderVariables.StyleRight},  var(${CellBorderVariables.Style}, none))`,
            "border-bottom-style": `var(${CellBorderVariables.StyleBottom}, var(${CellBorderVariables.Style}, none))`,
            "border-left-style":   `var(${CellBorderVariables.StyleLeft},   var(${CellBorderVariables.Style}, none))`,
        },
    });

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(CellBordersElement.STYLES);

        const div = document.createElement("div");
        shadow.appendChild(div);
    }
}
