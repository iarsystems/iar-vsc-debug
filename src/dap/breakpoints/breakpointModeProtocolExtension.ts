/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { OutputEvent } from "@vscode/debugadapter";
import { CommandRegistry } from "../commandRegistry";
import { CustomRequest } from "../customRequest";
import { DapEventSink } from "../utils";
import { CodeBreakpointMode } from "./breakpointMode";
import { CSpyBreakpointService } from "./cspyBreakpointService";

/**
 * Provides some DAP extensions for setting the "default" breakpoint mode (e.g.
 * hardware, software, trace start). This is used for breakpoints that do not
 * have an explicit mode set.
 *
 * By default, VS Code doesn't set a mode for newly created breakpoints, so this
 * is intended to make it easier to set many breakpoints of a specific mode
 * without having to manually specify the mode for each of them.
 */
export class BreakpointModeProtocolExtension {
    constructor(
        private readonly breakpointService: CSpyBreakpointService,
        eventSink: DapEventSink,
        initialBreakpointMode: CodeBreakpointMode | undefined,
        requestRegistry: CommandRegistry<unknown, unknown>,
        consoleCommandRegistry: CommandRegistry<void, string>,
    ) {
        const bpTypeMessage = (mode: CodeBreakpointMode) =>
            `Now using ${mode} breakpoints (only applies to new breakpoints)`;
        if (
            initialBreakpointMode !== undefined &&
            this.breakpointService.
                supportedCodeBreakpointModes().
                includes(initialBreakpointMode)
        ) {
            this.breakpointService.setDefaultCodeBreakpointMode(
                initialBreakpointMode,
            );
            eventSink.sendEvent(
                new OutputEvent(
                    `Using '${initialBreakpointMode}' breakpoint mode.\n`,
                ),
            );
        } else {
            const defaultBreakpointMode =
                this.breakpointService.supportedCodeBreakpointModes()[0];
            if (defaultBreakpointMode !== undefined) {
                this.breakpointService.setDefaultCodeBreakpointMode(
                    defaultBreakpointMode,
                );
            }
        }

        this.breakpointService.supportedCodeBreakpointModes().forEach(mode => {
            consoleCommandRegistry.registerCommand("__breakpoints_set_mode_" + mode, () => {
                this.breakpointService.setDefaultCodeBreakpointMode(mode);
                return Promise.resolve(bpTypeMessage(mode));
            });
        });

        requestRegistry.registerCommandWithTypeCheck(
            CustomRequest.Names.SET_BREAKPOINT_MODE,
            CustomRequest.isSetBreakpointModeArgs,
            mode => {
                if (this.breakpointService.supportedCodeBreakpointModes().includes(mode)) {
                    this.breakpointService.setDefaultCodeBreakpointMode(mode);
                    eventSink.sendEvent(new OutputEvent(bpTypeMessage(mode) + "\n"));
                    return Promise.resolve();
                } else {
                    eventSink.sendEvent(new OutputEvent("Cannot set breakpoint mode (not supported by driver)\n"));
                    return Promise.reject(new Error());
                }
            },
        );

        requestRegistry.registerCommand(CustomRequest.Names.GET_BREAKPOINT_MODES,
            (): CustomRequest.GetBreakpointModesResponse => this.breakpointService.supportedCodeBreakpointModes());
    }
}