/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { OutputEvent } from "@vscode/debugadapter";
import { CommandCallback, CommandRegistry } from "../commandRegistry";
import { CustomRequest } from "../customRequest";
import { DapEventSink } from "../utils";
import { BreakpointType } from "./cspyBreakpointService";
import { CSpyDriver } from "./cspyDriver";

/**
 * Provides some DAP extensions for setting breakpoint types (e.g. hardware, software or auto), since this is not supported
 * in standard DAP. This class registers three custom DAP requests and three console commands, one for each breakpoint
 * type.
 */
export class BreakpointTypeProtocolExtension {
    private breakpointType = BreakpointType.AUTO;

    constructor(
        private readonly driver: CSpyDriver,
        eventSink: DapEventSink,
        initialBreakpointType: BreakpointType | undefined,
        requestRegistry: CommandRegistry<unknown, unknown>,
        consoleCommandRegistry: CommandRegistry<void, string>,
    ) {
        const bpTypeMessage = (type: BreakpointType) => `Now using ${type} breakpoints (only applies to new breakpoints)`;
        if (initialBreakpointType !== undefined && this.getSupportedBreakpointTypes().includes(initialBreakpointType)) {
            this.breakpointType = initialBreakpointType;
            eventSink.sendEvent(new OutputEvent(`Using '${initialBreakpointType}' breakpoint type.\n`));
        } else {
            const defaultBreakpointType = this.getSupportedBreakpointTypes()[0];
            if (defaultBreakpointType === undefined) {
                throw new Error("The driver does specify any supported breakpoint types");
            }
        }
        // If the driver supports it, register console commands and custom requests
        this.getSupportedBreakpointTypes().forEach(type => {
            consoleCommandRegistry.registerCommand("__breakpoints_set_type_" + type, () => {
                this.breakpointType = type;
                return Promise.resolve(bpTypeMessage(type));
            });
        });
        // Custom requests are always registered, but will give an error if made on a driver that doesn't support it.
        const makeCustomRequestCommand = (name: string, type: BreakpointType): [string, CommandCallback<unknown, unknown>] => {
            return [name, () => {
                if (this.getSupportedBreakpointTypes().includes(type)) {
                    this.breakpointType = type;
                    eventSink.sendEvent(new OutputEvent(bpTypeMessage(type) + "\n"));
                    return Promise.resolve();
                } else {
                    eventSink.sendEvent(new OutputEvent("Cannot set breakpoint type (not supported by driver)"));
                    return Promise.reject(new Error());
                }
            }];
        };
        requestRegistry.registerCommand(...makeCustomRequestCommand(CustomRequest.Names.USE_AUTO_BREAKPOINTS, BreakpointType.AUTO));
        requestRegistry.registerCommand(...makeCustomRequestCommand(CustomRequest.Names.USE_HARDWARE_BREAKPOINTS, BreakpointType.HARDWARE));
        requestRegistry.registerCommand(...makeCustomRequestCommand(CustomRequest.Names.USE_SOFTWARE_BREAKPOINTS, BreakpointType.SOFTWARE));

        requestRegistry.registerCommand(CustomRequest.Names.GET_BREAKPOINT_TYPES,
            (): CustomRequest.BreakpointTypesResponse => this.getSupportedBreakpointTypes());
    }

    getBreakpointType() {
        return this.breakpointType;
    }

    private getSupportedBreakpointTypes(): BreakpointType[] {
        return Array.from(this.driver.codeBreakpointFactories.keys());
    }
}