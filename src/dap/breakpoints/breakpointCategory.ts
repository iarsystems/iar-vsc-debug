/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Lists all C-SPY breakpoint categories (that we need to know about)
 */
export enum BreakpointCategory {
    // Code breakpoints
    EMUL_CODE = "EMUL_CODE",
    STD_CODE2 = "STD_CODE2",
    HW_CODE   = "HW_CODE",
    // Data breakpoints
    STD_DATA2 = "STD_DATA2",
    EMUL_DATA = "EMUL_DATA",
}
