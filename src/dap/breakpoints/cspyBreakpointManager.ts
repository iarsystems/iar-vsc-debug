

import * as Breakpoints from "../thrift/bindings/Breakpoints";
import { DebugProtocol } from "vscode-debugprotocol";
import { Breakpoint } from "../thrift/bindings/shared_types";
import { Disposable } from "../disposable";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import { BREAKPOINTS_SERVICE } from "../thrift/bindings/breakpoints_types";
import { ThriftClient } from "../thrift/thriftClient";
import { LocOnlyDescriptor } from "./descriptors/locOnlyDescriptor";
import { DescriptorReader } from "./descriptors/descriptorReader";
import { OsUtils } from "../../utils/osUtils";
import { EmulCodeBreakpointDescriptor, EmulCodeBreakpointType } from "./descriptors/emulCodeBreakpointDescriptor";
import { BreakpointCategory } from "./breakpointCategory";
import { DescriptorWriter } from "./descriptors/descriptorWriter";
import { BreakpointDescriptor } from "./descriptors/breakpointDescriptor";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";
import { CSpyDriver, CSpyDriverUtils } from "./CSpyDriver";

/**
 * Sets, unsets and verifies C-SPY breakpoints.
 */
export class CSpyBreakpointManager implements Disposable {
    // TODO: cspyserver seems to automatically set breakpoints from the .ewp file (i.e. from the EW). We probably don't want that.

    /**
     * Creates and returns a new breakpoint manager
     * @param serviceMgr The service manager handling the debug session
     * @param driver The driver running the debug session
     */
    static async instantiate(serviceMgr: ThriftServiceManager,
        clientLinesStartAt1: boolean,
        clientColumnsStartAt1: boolean,
        driver: CSpyDriver): Promise<CSpyBreakpointManager> {
        return new CSpyBreakpointManager(
            await serviceMgr.findService(BREAKPOINTS_SERVICE, Breakpoints.Client),
            clientLinesStartAt1,
            clientColumnsStartAt1,
            driver
        );
    }

    private constructor(private readonly breakpointService: ThriftClient<Breakpoints.Client>,
                private readonly clientLinesStartAt1: boolean,
                private readonly clientColumnsStartAt1: boolean,
                private readonly driver: CSpyDriver) {
    }

    async setBreakpointsFor(source: DebugProtocol.Source, bps: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        // remove all bps for this source file, and replace with the new ones
        if (!source.path) {
            return Promise.reject(new Error("Cannot set breakpoints without a path"));
        }
        const sourcePath = source.path;
        const currentBps = await this.breakpointService.service.getBreakpoints();
        const toRemove = currentBps.filter(bp => {
            const uleData = this.parseSourceUle(bp.ule);
            return OsUtils.pathsEqual(uleData[0], sourcePath);
        });
        await Promise.all(toRemove.map(bp => this.breakpointService.service.removeBreakpoint(bp.id) ));

        // Serialize and set all the new bps
        return Promise.all(bps.map(async bp => {
            try {
                const dbgrLine = this.convertClientLineToDebugger(bp.line);
                const dbgrCol = bp.column ? this.convertClientColumnToDebugger(bp.column) : 1;
                const descriptor = this.createDefaultBreakpointAt(`{${sourcePath}}.${dbgrLine}.${dbgrCol}`);

                const writer = new DescriptorWriter();
                descriptor.serialize(writer);
                const newBp = await this.breakpointService.service.setBreakpointFromDescriptor(writer.result);

                const actualDescriptor = new LocOnlyDescriptor(new DescriptorReader(newBp.descriptor));
                const [, actualLine, actualCol] = this.parseSourceUle(actualDescriptor.ule);
                return {
                    verified: newBp.valid,
                    line: this.convertDebuggerLineToClient(actualLine),
                    column: this.convertDebuggerColumnToClient(actualCol),
                    message: newBp.description,
                    source,
                };
            } catch (e) {
                console.error(e);
                return {
                    verified: false,
                    line: bp.line,
                    column: bp.column,
                    message: e instanceof Error ? e.message : undefined,
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

    // Creates a standard code breakpoint according to the driver used
    private createDefaultBreakpointAt(ule: string): BreakpointDescriptor {
        const type = CSpyDriverUtils.getCodeBreakpointCategory(this.driver);
        switch (type) {
        case BreakpointCategory.STD_CODE2:
            return new LocEtcDescriptor([type, ule]);
        case BreakpointCategory.EMUL_CODE:
            // TODO: How to determine the bp type? The user probably wants to be able to choose
            return new EmulCodeBreakpointDescriptor([type, ule, EmulCodeBreakpointType.kDriverDefaultBreakpoint]);
        default:
            throw new Error("Don't know how to create breakpoints for category: " + type);
        }
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