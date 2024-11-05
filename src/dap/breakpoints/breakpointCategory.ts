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
    STD_TRACE_START2 = "STD_TRACE_START2",
    STD_TRACE_STOP2  = "STD_TRACE_STOP2",
    HW_CODE   = "HW_CODE",
    EMUL_HW_CODE   = "EMU_HW_CODE", //RX
    EMUL_SW_CODE   = "EMU_SW_CODE", //RX
    EMUL_FLASH     = "EMUL_FLASH",
    EMUL_TRACE_START  = "EMUL_TRACE_START",
    EMUL_TRACE_STOP   = "EMUL_TRACE_STOP",
    EMUL_TRACE_FILTER = "EMUL_TRACE_FILTER",
    TDL_EMUL_TRACE_START = "TDL_EMUL_TRACE_START",
    TDL_EMUL_TRACE_STOP  = "TDL_EMUL_TRACE_STOP",
    EMU_TIMER_START = "EMU_TIMER_START",
    EMU_TIMER_STOP  = "EMU_TIMER_STOP",
    // Data breakpoints
    STD_DATA2 = "STD_DATA2",
    EMUL_DATA = "EMUL_DATA",
    EMUL_DATA_BREAK = "EMUL_DATA_BREAK", //RX
    // Log breakpoints
    STD_LOG2 = "STD_LOG2",
}
