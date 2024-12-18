/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Maps each icon name to its corresponding codicon name and (optionally) color
 */
export const IconMap = new Map<string, [string, string | undefined]>([
    // Code coverage window
    ["CSPY_CODE_COVERED_NONE", ["star-empty", "red"]],
    ["CSPY_CODE_COVERED_MEDIUM", ["star-half", "yellow"]],
    ["CSPY_CODE_COVERED_FULL", ["star-full", "green"]],
    ["IDI_CODECOV_ENABLE", ["play-circle", undefined]],
    ["IDI_CODECOV_CLEAR", ["clear-all", undefined]],
    ["IDI_CODECOV_SAVE_SESSION", ["sign-in", undefined]],
    ["IDI_CODECOV_RESTORE_SESSION", ["sign-out", undefined]],
    // Images window
    ["IDI_DBG_IMAGES_ON_FOCUSED", ["pass-filled", undefined]],
    ["IDI_DBG_IMAGES_ON_UNFOCUSED", ["pass", undefined]],
    // Macro window
    ["IDE_PERSIST_EXPR_VAL", ["refresh", "green"]],
    ["IDE_EXPR_VAL", ["refresh", "blue"]],
    // General icons
    ["IDI_DBU_CODE_BP_MARK", ["circle-filled", undefined]],
    ["IDI_DBU_CODE_BP_MARK_DISABLED", ["circle", undefined]],
    ["IDI_DBU_TRACE_BP_MARK", ["debug-breakpoint-conditional", undefined]],
    [
        "IDI_DBU_TRACE_BP_MARK_DISABLED",
        ["debug-breakpoint-conditional-unverified", undefined],
    ],
    ["IDI_CODE_BP", ["circle-filled", undefined]],
    ["IDI_DATA_BP", ["debug-breakpoint-conditional", undefined]],
    ["IDI_DBU_TRACE_FILTER_BP_MARK", ["circle-filled", undefined]],
    ["IDI_DBU_TRACE_FILTER_BP_MARK_DISABLED", ["circle", undefined]],
    ["IDI_DBU_TRACE_TRIGGER_BP_MARK", ["circle-filled", undefined]],
    ["IDI_DBU_TRACE_TRIGGER_BP_MARK_DISABLED", ["circle", undefined]],
    ["IDI_DBU_PROF_CLOCK", ["play-circle", undefined]],
    ["IDI_DBU_PROF_RESET", ["redo", undefined]],
    ["IDI_DBU_PROF_GRAPH", ["graph-line", undefined]],
    ["IDI_DBU_PROF_PROPERTIES", ["settings-gear", undefined]],
    ["IDI_DBU_PROF_REFRESHNOW", ["refresh", undefined]],
    ["IDI_DBU_PROF_AUTOREFRESH", ["issue-reopened", undefined]],
    ["IDI_DBU_PROF_SAVE", ["save", undefined]],
    ["IDI_DBU_PROF_SNAP", ["arrow-both", undefined]],
    // Trace windows
    ["IDI_DBU_TRACE_ONOFF", ["play-circle", undefined]],
    ["IDI_DBU_TRACE_CLEAR", ["clear-all", undefined]],
    ["IDI_DBU_TRACE_MIXEDMODE", ["diff-single", undefined]],
    ["IDI_DBU_TRACE_BROWSE", ["editor-layout", undefined]],
    ["IDI_DBU_TRACE_FIND", ["search", undefined]],
    ["IDI_DBU_TRACE_SETTINGS", ["settings", undefined]],
    ["IDI_DBU_TRACE_COLUMNS", ["split-horizontal", undefined]],
    ["IDI_DBU_TRACE_VIEW", ["server-process", undefined]],
    ["IDI_DBU_FIND_IN_TRACE", ["search", undefined]],
    ["IDI_TRACE_DISABLED", ["plug", undefined]],
    ["IDI_TRACE_ENABLED", ["debug-disconnect", undefined]],
    ["IDI_DBU_TRACE_BOOKMARK", ["bookmark", undefined]],
    ["IDI_DBU_TRACE_CALL", ["chevron-right", undefined]],
    ["IDI_DBU_TRACE_RETURN", ["chevron-left", undefined]],
    ["IDI_DBU_TRACE_INTERRUPT", ["triangle-right", undefined]],
    ["IDI_DBU_TRACE_FOUND", ["arrow-right", undefined]],
    ["IDI_DBU_TRACE_EXEC_PT", ["debug-breakpoint-log", undefined]],
    ["IDI_DBU_TRACE_DISCONT", ["stop-circle", undefined]],
    ["IDI_MORE", ["add", undefined]],
    ["IDI_DBG_DISASM_MIXEDMODE", ["", undefined]],
    ["IDI_DISASM", ["", undefined]],
    ["IDI_DBG_EXPR_INSPECTOR_COLLAPSED", ["diff-added", undefined]],
    ["IDI_LOG", ["info", undefined]],
    ["IDI_DBG_CURRENT_CONTEXT", ["debug-stackframe", "green"]],
    ["IDI_DBG_DISABLED_BREAKPOINT", ["", undefined]],
    ["IDI_DBG_INSPECTED_CONTEXT", ["debug-stackframe", "yellow"]],
    ["IDI_DBG_BREAKPOINT", ["", undefined]],
    ["IDI_DBG_EXPR_INSPECTOR_EXPANDED", ["diff-removed", undefined]],
    ["IDI_DBG_EXPR_INSPECTOR_COLLAPSED_DISABLED", ["diff-added", "var(--vscode-radio-inactiveForeground)"]],
    ["IDI_DBG_EXPR_INSPECTOR_EXPANDED_DISABLED", ["diff-removed", "var(--vscode-radio-inactiveForeground)"]],
    ["IDI_DBG_EXPR_INSPECTOR_LESS", ["", undefined]],
    ["IDI_DBG_LOCATION_COVERED", ["", undefined]],
    ["IDI_AUTOREFRESH", ["issue-reopened", undefined]],
    ["IDI_REFRESH", ["refresh", undefined]],
    ["CSPY_ARROW_CURRENT", ["debug-stackframe", "green"]],
    ["CSPY_ARROW_INSPECTED", ["debug-stackframe", "yellow"]],
    ["CSPY_CALLSTACK_STEP_INTO", ["", undefined]],
    ["CSPY_LOCATION_COVERED", ["", undefined]],
    // Cores window
    ["IDI_DBG_CORE_STOPPED", ["stop-circle", "red"]],
    ["IDI_DBG_CORE_STOPPED_STR", ["stop-circle", "red"]],
    ["IDI_DBG_CORE_STOPPED_UNFOCUSED", ["stop-circle", "salmon"]],
    ["IDI_DBG_CORE_STOPPED_UNFOCUSED_STR", ["stop-circle", "salmon"]],
    ["IDI_DBG_CORE_RUNNING", ["play-circle", "green"]],
    ["IDI_DBG_CORE_RUNNING_STR", ["play-circle", "green"]],
    ["IDI_DBG_CORE_RUNNING_UNFOCUSED", ["play-circle", "lightgreen"]],
    ["IDI_DBG_CORE_RUNNING_UNFOCUSED_STR", ["play-circle", "lightgreen"]],
    ["IDI_DBG_CORE_SLEEPING", ["play-circle", "olivedrab"]],
    ["IDI_DBG_CORE_SLEEPING_STR", ["play-circle", "olivedrab"]],
    ["IDI_DBG_CORE_SLEEPING_UNFOCUSED", ["play-circle", "palegreen"]],
    ["IDI_DBG_CORE_SLEEPING_UNFOCUSED_STR", ["play-circle", "palegreen"]],
    ["IDI_DBG_CORE_ZOMBIE", ["stop", "grey"]],
    ["IDI_DBG_CORE_ZOMBIE_STR", ["stop", "grey"]],
    ["IDI_DBG_CORE_ZOMBIE_UNFOCUSED", ["stop", "ghostwhite"]],
    ["IDI_DBG_CORE_ZOMBIE_UNFOCUSED_STR", ["stop", "ghostwhite"]],
    ["IDI_DBG_CORES_RUN_ALL", ["run-all", undefined]],
    ["IDI_DBG_CORES_STOP_ALL", ["debug-stop", undefined]],
    ["IDI_DBG_CORES_LOCKSTEP_ON", ["", undefined]],
    ["IDI_DBG_CORES_LOCKSTEP_OFF", ["", undefined]],
    // Quick-watch
    ["IDI_DBG_QWATCH_RECALCULATE", ["refresh", undefined]],
    ["IDI_PERSIST_EXPR_EVAL", ["refresh", "green"]],
    ["IDI_DBG_SETTINGS", ["settings", undefined]],
    // Registers
    ["IDI_DBG_REG_FIND_PREVIOUS", ["arrow-up", undefined]],
    ["IDI_DBG_REG_FIND_NEXT", ["arrow-down", undefined]],
]);
