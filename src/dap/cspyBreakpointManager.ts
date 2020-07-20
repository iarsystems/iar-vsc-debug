'use strict';

import { Breakpoint } from "vscode-debugadapter";
import * as Breakpoints from "./thrift/bindings/Breakpoints";
import { DebugProtocol } from "vscode-debugprotocol";
import { AccessType } from "./thrift/bindings/shared_types";

/**
 * Sets, unsets and verifies C-SPY breakpoints.
 */
export class CSpyBreakpointManager {
    // TODO: allow setting logpoints, data breakpoints etc, and enable those DAP capabilities
    // TODO: cspyserver seems to automatically set breakpoints from the .ewp file (i.e. from the EW). We probably don't want that.

    constructor(private breakpointService: Breakpoints.Client,
                private clientLinesStartAt1: boolean,
                private clientColumnsStartAt1: boolean) {
    }

    async setBreakpointsFor(source: DebugProtocol.Source, bps: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        // remove all bps for this source file, and replace with the new ones
        const sourcePath = source.path ? source.path : source.name;
        const currentBps = await this.breakpointService.getBreakpoints();
        const toRemove = currentBps.filter(bp => {
            if (!bp.isUleBased) { return false; } // Not sure how to handle these
            const uleData = this.parseUle(bp.ule);
            return uleData[0] === sourcePath;
        });
        await Promise.all(toRemove.map(bp => this.breakpointService.removeBreakpoint(bp.id) ));

        return Promise.all(bps.map(async bp => {
            try {
                const dbgrLine = this.convertClientLineToDebugger(bp.line);
                const dbgrCol = bp.column ? this.convertClientColumnToDebugger(bp.column) : 1;
                const newBp = await this.breakpointService.setBreakpointOnUle(`{${sourcePath}}.${dbgrLine}.${dbgrCol}`, AccessType.kDkReadWriteAccess); // does the access type even matter for code bps?
                const [_, newLine, newCol] = this.parseUle(newBp.ule);
                console.log(newBp);
                // TODO: the debugger doesn't seem to adjust the line on the ule, e.g. if the line is empty. If we parse the descriptor, we can get the actual line of the bp.
                return {
                    verified: newBp.valid,
                    line: this.convertDebuggerLineToClient(newLine),
                    column: this.convertDebuggerColumnToClient(newCol),
                    source,
                };
            } catch (e) {
                console.error(e);
                return {
                    verified: false,
                    line: bp.line,
                    column: bp.column,
                    source,
                }
            }
        }));
    }

    private parseUle(ule: string): [string, number, number] {
        const match = /^{(.+)}\.(\d+)\.(\d+)$/.exec(ule);
        if (!match || match.length !== 4) {
            throw new Error("Invalid ULE: " + ule);
        }
        return [match[1], Number(match[2]), Number(match[3])];
    }

    private convertClientLineToDebugger(line: number): number {
        return this.clientLinesStartAt1 ? line : line + 1;
	}

	private convertDebuggerLineToClient(line: number): number {
        return this.clientLinesStartAt1 ? line : line - 1;
	}

	private convertClientColumnToDebugger(column: number): number {
        return this.clientColumnsStartAt1 ? column : column + 1;
	}

	private convertDebuggerColumnToClient(column: number): number {
        return this.clientColumnsStartAt1 ? column : column - 1;
	}
}