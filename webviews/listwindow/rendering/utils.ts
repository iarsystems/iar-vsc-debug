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
 * Gets the closest ancestor of a node that is scrollable vertically
 */
export function getScrollParent(node: HTMLElement): HTMLElement | null {
    let parent = node.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        if (["auto", "scroll"].includes(style.overflowY)) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
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
        const big = BigInt(str);
        // Int64s are signed, so if the most significant bit is set, we should
        // count that bit as negative instead.
        if (int64.buffer.data[0] === undefined) {
            return big;
        }
        if ((int64.buffer.data[0] & (1 << 7)) === 0) {
            return big;
        }
        return big - BigInt(2) * (BigInt(1) << BigInt(63));
    }
    throw new Error("Got an invalid Int64");
}

/**
 * Converts an int64 we've been sent from the extension into a Number. Throws if
 * the number is too large to be represented as a Number.
 */
export function toNumber(int64: Serializable<Int64>): number {
    const big = toBigInt(int64);
    if (big > Number.MAX_SAFE_INTEGER || big < Number.MIN_SAFE_INTEGER) {
        throw new Error(`The number ${big} is too large to be represented as a Number`);
    }
    return Number(big);
}