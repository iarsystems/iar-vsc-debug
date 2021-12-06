
/**
 * Hold names of all settings for this extension
 */
export namespace SettingsConstants {
	// The section all settings use (passed to vscode.workspace.getConfiguration)
	export const MAIN_SECTION = "iardbg";

	export const BREAKPOINT_TYPE = "breakpointType";
	// Ought to match the enum in package.json
	export enum BreakpointTypeValues {
		AUTO = "Auto",
		HARDWARE = "Hardware",
		SOFTWARE = "Software",
	}
}