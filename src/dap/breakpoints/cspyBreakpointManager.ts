

import * as Breakpoints from "../thrift/bindings/Breakpoints";
import { DebugProtocol } from "vscode-debugprotocol";
import { AccessType, Breakpoint } from "../thrift/bindings/shared_types";
import { Disposable } from "../disposable";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import { BREAKPOINTS_SERVICE } from "../thrift/bindings/breakpoints_types";
import { ThriftClient } from "../thrift/thriftClient";
import { LocOnlyDescriptor } from "./descriptors/locOnlyDescriptor";
import { DescriptorReader } from "./descriptors/descriptorReader";
import { OsUtils } from "../../utils/osUtils";

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

    private constructor(private readonly breakpointService: ThriftClient<Breakpoints.Client>,
                private readonly clientLinesStartAt1: boolean,
                private readonly clientColumnsStartAt1: boolean) {
    }

    async setBreakpointsFor(source: DebugProtocol.Source, bps: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        // remove all bps for this source file, and replace with the new ones
        if (!source.path) {
            return Promise.reject(new Error("Cannot set breakpoints without a path"));
        }
        const sourcePath = source.path;
        const currentBps = await this.breakpointService.service.getBreakpoints();
        const toRemove = currentBps.filter(bp => {
            if (!bp.isUleBased) {
                return true;
            } // Not sure how to handle these
            if (bp.category !== "STD_CODE2" && bp.category !== "STD_CODE") {
                return true;
            }
            const uleData = this.parseSourceUle(bp.ule);
            return OsUtils.pathsEqual(uleData[0], sourcePath);
        });
        await Promise.all(toRemove.map(bp => this.breakpointService.service.removeBreakpoint(bp.id) ));

        return Promise.all(bps.map(async bp => {
            try {
                const dbgrLine = this.convertClientLineToDebugger(bp.line);
                const dbgrCol = bp.column ? this.convertClientColumnToDebugger(bp.column) : 1;
                const newBp = await this.breakpointService.service.setBreakpointOnUle(`{${sourcePath}}.${dbgrLine}.${dbgrCol}`, AccessType.kDkFetchAccess);

                if (newBp.category !== "STD_CODE2" && newBp.category !== "STD_CODE") {
                    throw new Error("Encountered unsupported BP category: " + newBp.category);
                }
                const descriptor = new LocOnlyDescriptor(new DescriptorReader(newBp.descriptor));

                const [, newLine, newCol] = this.parseSourceUle(descriptor.ule);
                return {
                    verified: newBp.valid,
                    line: this.convertDebuggerLineToClient(newLine),
                    column: this.convertDebuggerColumnToClient(newCol),
                    message: newBp.description,
                    source,
                };
            } catch (e) {
                console.error(e);
                return {
                    verified: false,
                    line: bp.line,
                    column: bp.column,
                    source,
                };
            }
        }));
    }

    /**
     * Get the breakpoints which have been submitted to C-SPY.
     */
    getBreakpoints(): Promise<Breakpoint[]> {
        return Promise.resolve(this.breakpointService.service.getBreakpoints());
    }

    dispose(): void {
        this.breakpointService.dispose();
    }

    private parseSourceUle(ule: string): [string, number, number] {
        const match = /^{(.+)}\.(\d+)\.(\d+)$/.exec(ule);
        if (!match || match.length !== 4 || !match[1]) {
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