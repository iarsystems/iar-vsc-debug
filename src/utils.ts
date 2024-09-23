/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Int64 } from "thrift";
import {
    Serializable,
    SerializedBigInt,
} from "../webviews/listwindow/protocol";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";

/**
 * Converts an Int64 to a bigint.
 */
export function toBigInt(value: Int64): bigint {
    const big = BigInt(`0x${value.toOctetString()}`);
    // Int64s are signed, so if the most significant bit is set, we should
    // count that bit as negative instead.
    if (value.buffer[0] === undefined) {
        return big;
    }
    if ((value.buffer[0] & (1 << 7)) === 0) {
        return big;
    }
    return big - 2n * (1n << 63n);
}

/**
 * Converts a bigint to an Int64.
 */
export function toInt64(value: SerializedBigInt | bigint): Int64 {
    if (typeof value !== "bigint") {
        value = BigInt(value.value);
    }

    // The string-based Int64 constructor is broken for negative numbers (it
    // encodes them as signed 32-bit ints), so convert negative numbers to their
    // unsigned 64-bit equivalent first.
    if (value < 0n) {
        value += 2n * (1n << 63n);
    }

    return new Int64(value.toString(16));
}

/**
 * Convert a serialized tree to a real property tree
 */
export function unpackTree(
    treeDescription: Serializable<PropertyTreeItem>,
): PropertyTreeItem {
    const item = new PropertyTreeItem();

    item.key = treeDescription.key;
    item.value = treeDescription.value;
    item.children = treeDescription.children.map(
        (element: Serializable<PropertyTreeItem>) => {
            return unpackTree(element);
        },
    );

    return item;
}