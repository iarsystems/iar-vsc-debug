/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A helper decorator which registers a class as a custom HTML element
 * @param name The HTML element name to register the class as
 */
export function customElement(
    name: string,
    options: ElementDefinitionOptions | undefined = undefined,
) {
    return (constructor: CustomElementConstructor) => {
        customElements.define(name, constructor, options);
    };
}
