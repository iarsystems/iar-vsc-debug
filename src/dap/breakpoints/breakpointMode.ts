/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { DebugProtocol } from "@vscode/debugprotocol";

/**
 * Different variants of breakpoints. These are applicable to source and
 * instruction breakpoints. This is a DAP concept originally, but we allow some
 * non-standard way of setting the mode (such as via custom DAP requests sent
 * using VS Code commands).
 *
 * If supported by the driver, each mode maps into a C-SPY breakpoint category
 * (see BreakpointCategory).
 *
 * Make sure to keep this in sync with the settings/commands in package.json,
 * and the constants in breakpointModesFrontend.ts
 */
export enum CodeBreakpointMode {
    Auto = "auto",
    Software = "software",
    Hardware = "hardware",
    TraceStart = "trace_start",
    TraceStop = "trace_stop",
    TraceFilter = "trace_filter",
    Flash = "flash",
    TimerStart = "timer_start",
    TimerStop = "timer_stop",
}

/**
 * These labels for each mode are given to the DAP client. In VS Code, these are
 * shown when you press "Edit Breakpoint..." from a breakpoint's context menu
 */
const CODE_BREAKPOINT_MODES: { [K in CodeBreakpointMode]: { label: string, description?: string } } = {
    [CodeBreakpointMode.Auto]: {
        label: "Auto",
        description: "Use the driver's default mode.",
    },
    [CodeBreakpointMode.Software]: {
        label: "Software",
    },
    [CodeBreakpointMode.Hardware]: {
        label: "Hardware",
    },
    [CodeBreakpointMode.TraceStart]: {
        label: "Trace Start",
    },
    [CodeBreakpointMode.TraceStop]: {
        label: "Trace Stop",
    },
    [CodeBreakpointMode.TraceFilter]: {
        label: "Trace Filter",
    },
    [CodeBreakpointMode.Flash]: {
        label: "Flash",
    },
    [CodeBreakpointMode.TimerStart]: {
        label: "Timer Start",
    },
    [CodeBreakpointMode.TimerStop]: {
        label: "Timer Stop",
    },
};

export namespace BreakpointModes {
    export function getBreakpointModes(): Array<DebugProtocol.BreakpointMode> {
        const modes = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_, modeId] of Object.entries(CodeBreakpointMode)) {
            const mode = CODE_BREAKPOINT_MODES[modeId];
            modes.push({
                mode: modeId,
                ...mode,
                appliesTo: ["source", "instruction"],
            });
        }
        return modes;
    }

    export function getLabelForMode(mode: CodeBreakpointMode): string {
        return CODE_BREAKPOINT_MODES[mode].label;
    }

    export function isBreakpointMode(modeStr: string): modeStr is CodeBreakpointMode {
        return Object.entries(CodeBreakpointMode).some(([, mode]) => modeStr === mode);
    }
}
