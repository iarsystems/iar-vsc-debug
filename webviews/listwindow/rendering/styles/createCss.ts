/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as CSS from "csstype";

/**
 * A collection of style rule definitions. Use {@link createCss} to
 * convert this to something usable.
 */
export interface StyleRules {
    [selector: string]: CSS.PropertiesHyphen;
}

/**
 * Converts our custom {@link StyleRules} to a {@link CSSStyleSheet}, which can
 * be added as an adopted style sheet to 'document' or a shadow DOM.
 */
export function createCss(
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
