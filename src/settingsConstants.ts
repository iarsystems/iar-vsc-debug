/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Hold names of all settings for this extension
 */
export namespace SettingsConstants {
	// The section all settings use (passed to vscode.workspace.getConfiguration)
	export const MAIN_SECTION = "iar-debug";

	export const BREAKPOINT_TYPE = "breakpointType";
	// Ought to match the enum in package.json
	export enum BreakpointTypeValue {
		AUTO = "Auto",
		HARDWARE = "Hardware",
		SOFTWARE = "Software",
	}
}