/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Holds the names of all supported custom requests (i.e. the string values used to perform the requests)
 */
export enum CustomRequest {
	USE_AUTO_BREAKPOINTS = "useAutoBreakpoints",
	USE_HARDWARE_BREAKPOINTS = "useHardwareBreakpoints",
	USE_SOFTWARE_BREAKPOINTS = "useSoftwareBreakpoints",
	REGISTERS = "registers",
}

export interface RegistersResponse {
	svdContent: string | undefined,
}
