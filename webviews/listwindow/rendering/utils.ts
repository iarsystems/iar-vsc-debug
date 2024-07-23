/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Serializable } from "../protocol";
import Int64 from "node-int64";

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

/**
 * Converts an int64 we've been sent from the extension into a bigint (which is
 * more practical to use for comparisons and such).
 */
export function toBigInt(int64: Serializable<Int64>): bigint {
    // This is pretty hacky, type safety be gone!
    if ("data" in int64.buffer && Array.isArray(int64.buffer.data)) {
        let str = "0x";
        for (const num of int64.buffer.data) {
            str += num.toString(16);
        }
        return BigInt(str);
    }
    throw new Error("Got an invalid Int64");
}