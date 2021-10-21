'use strict';

import * as Breakpoints from "./thrift/bindings/Breakpoints";
import { DebugProtocol } from "vscode-debugprotocol";
import { AccessType, Breakpoint, Location } from "./thrift/bindings/shared_types";
import { Disposable } from "./disposable";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { BREAKPOINTS_SERVICE } from "./thrift/bindings/breakpoints_types";
import { ThriftClient } from "./thrift/thriftClient";

/**
 * Sets, unsets and verifies C-SPY breakpoints.
 */
export class CSpyBreakpointManager implements Disposable {
    // TODO: allow setting logpoints, data breakpoints etc, and enable those DAP capabilities
    // TODO: cspyserver seems to automatically set breakpoints from the .ewp file (i.e. from the EW). We probably don't want that.

    static async instantiate(serviceMgr: ThriftServiceManager,
                                clientLinesStartAt1: boolean,
                                clientColumnsStartAt1: boolean): Promise<CSpyBreakpointManager> {
        return new CSpyBreakpointManager(
            await serviceMgr.findService(BREAKPOINTS_SERVICE, Breakpoints.Client),
            clientLinesStartAt1,
            clientColumnsStartAt1
        );
    }

    private constructor(private breakpointService: ThriftClient<Breakpoints.Client>,
                private clientLinesStartAt1: boolean,
                private clientColumnsStartAt1: boolean) {
    }

    async setBreakpointsFor(source: DebugProtocol.Source, bps: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        // remove all bps for this source file, and replace with the new ones
        // TODO: instead, maybe try to match existing bps with new ones, and only remove/add those
        // that are not in both sets.
        const sourcePath = source.path ? source.path : source.name;
        const currentBps = await this.breakpointService.service.getBreakpoints();
        const toRemove = currentBps.filter(bp => {
            if (!bp.isUleBased) { return true; } // Not sure how to handle these
            if (bp.category !== "STD_CODE2" && bp.category !== "STD_CODE") { return true; }
            const uleData = this.parseSourceUle(bp.ule);
            return uleData[0] === sourcePath;
        });
        await Promise.all(toRemove.map(bp => this.breakpointService.service.removeBreakpoint(bp.id) ));

        return Promise.all(bps.map(async bp => {
            try {
                const dbgrLine = this.convertClientLineToDebugger(bp.line);
                const dbgrCol = bp.column ? this.convertClientColumnToDebugger(bp.column) : 1;
                const newBp = await this.breakpointService.service.setBreakpointOnUle(`{${sourcePath}}.${dbgrLine}.${dbgrCol}`, AccessType.kDkFetchAccess);

                // TODO: the debugger doesn't seem to adjust the line on the ule, e.g. if the line is empty. If we parse the descriptor, we can get the actual line of the bp.
                const [_, newLine, newCol] = this.parseSourceUle(newBp.ule);
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

    /**
     * Get the breakpoints which have been submitted to C-SPY.
     */
    async getBreakpoints(): Promise<Breakpoint[]> {
        return  this.breakpointService.service.getBreakpoints();
    }

    dispose(): void {
        this.breakpointService.dispose();
    }

    private parseSourceUle(ule: string): [string, number, number] {
        const match = /^{(.+)}\.(\d+)\.(\d+)$/.exec(ule);
        if (!match || match.length !== 4) {
            throw new Error("Invalid source ULE: " + ule);
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