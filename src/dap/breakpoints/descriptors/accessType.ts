/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Access types avaiable to data breakpoints. These seem to be universal to all drivers.
 */
export enum AccessType {
    ReadWrite = 0,
    Read,
    Write,
}