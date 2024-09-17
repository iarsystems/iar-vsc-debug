/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Int64 } from "thrift";
import { SerializedBigInt } from "../webviews/listwindow/protocol";

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
    return big - BigInt(2) * (BigInt(1) << BigInt(63));
}

/**
 * Converts a bigint to an Int64.
 */
export function toInt64(value: SerializedBigInt | bigint): Int64 {
    if (typeof value !== "bigint") {
        value = BigInt(value.value);
    }
    return new Int64(value.toString(16));
}
