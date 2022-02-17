
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
