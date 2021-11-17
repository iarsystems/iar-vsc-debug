

import * as Breakpoints from "../thrift/bindings/Breakpoints";
import { DebugProtocol } from "vscode-debugprotocol";
import * as Thrift from "../thrift/bindings/shared_types";
import { Disposable } from "../disposable";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import { BREAKPOINTS_SERVICE } from "../thrift/bindings/breakpoints_types";
import { ThriftClient } from "../thrift/thriftClient";
import { DescriptorWriter } from "./descriptors/descriptorWriter";
import { CSpyDriver, CSpyDriverUtils } from "./CSpyDriver";
import { CodeBreakpointDescriptorFactory, EmulCodeBreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { EmulCodeBreakpointType } from "./descriptors/emulCodeBreakpointDescriptor";


/**
 * Different types of breakpoints, only applicable to some drivers.
 * In practice these map to EmulCodeBreakpointType, but we want to hide that relation.
 */
export enum BreakpointType {
    AUTO = "auto", HARDWARE = "hardware", SOFTWARE = "software"
}

// A breakpoint which has been set in the cspy backend (it isn't necessary valid, just validated and known in the backend)
interface ValidatedBreakpoint {
    dapBp: DebugProtocol.SourceBreakpoint;
    cspyBp: Thrift.Breakpoint;
}

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

    // Stores all previously set breakpoints for all files.
    // Lets us figure out when a bp is added or removed in the frontend,
    // even though this information is not explicitly given to us via DAP.
    private readonly knownBreakpoints: Map<string, Array<ValidatedBreakpoint>> = new Map();

    // Holds driver-specific bp creation logic
    private readonly bpDescriptorFactory: CodeBreakpointDescriptorFactory;

    private constructor(private readonly breakpointService: ThriftClient<Breakpoints.Client>,
                private readonly clientLinesStartAt1: boolean,
                private readonly clientColumnsStartAt1: boolean,
                driver: CSpyDriver) {
        this.bpDescriptorFactory = CSpyDriverUtils.getCodeBreakpointDescriptorFactory(driver);
    }

    /**
     * Sets breakpoints for some source file, and clears all other breakpoints in the file.
     * Ignores those breakpoints which have already been set by a previous call.
     * @param source The source file to set breakpoints for
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setBreakpointsFor(source: DebugProtocol.Source, dapBps: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        if (!source.path) {
            return Promise.reject(new Error("Cannot set breakpoints without a path"));
        }

        const sourcePath = source.path;

        // We want to avoid clearing and recreating breakpoints which haven't changed since the last call.
        // We first figure out which bps have been removed in the frontend, and remove them
        const knownBreakpoints: ValidatedBreakpoint[] = this.knownBreakpoints.get(sourcePath) ?? [];
        const removedBps = knownBreakpoints.filter(bp => !dapBps.some(dabBp => CSpyBreakpointManager.bpsEqual(dabBp, bp.dapBp)) );
        await Promise.all(removedBps.map(bp => this.breakpointService.service.removeBreakpoint(bp.cspyBp.id) ));
        removedBps.forEach(bp => knownBreakpoints.splice(knownBreakpoints.indexOf(bp), 1) );

        // Set the new breakpoints in the backend, and store them
        const newBps = dapBps.filter(dapBp => !knownBreakpoints.some(bp => CSpyBreakpointManager.bpsEqual(dapBp, bp.dapBp)));
        await Promise.all(newBps.map(async dapBp => {
            const dbgrLine = this.convertClientLineToDebugger(dapBp.line);
            const dbgrCol = dapBp.column ? this.convertClientColumnToDebugger(dapBp.column) : 1;
            const descriptor = this.bpDescriptorFactory.createOnUle(`{${sourcePath}}.${dbgrLine}.${dbgrCol}`);

            const writer = new DescriptorWriter();
            descriptor.serialize(writer);
            try {
                const cspyBp = await this.breakpointService.service.setBreakpointFromDescriptor(writer.result);
                knownBreakpoints.push({ cspyBp, dapBp });
            } catch (e) {
                console.error(e);
            }
        }));

        // Map the requested BPs to a DAP result format, using data from each cspy BP
        const results: DebugProtocol.Breakpoint[] = [];
        dapBps.map(dapBp => {
            const validatedBp = knownBreakpoints.find(bp => CSpyBreakpointManager.bpsEqual(bp.dapBp, dapBp));
            if (validatedBp !== undefined) {
                const descriptor = this.bpDescriptorFactory.createFromString(validatedBp.cspyBp.descriptor);
                const [, actualLine, actualCol] = this.parseSourceUle(descriptor.ule);
                results.push({
                    verified: validatedBp.cspyBp.valid,
                    line: this.convertDebuggerLineToClient(actualLine),
                    column: this.convertDebuggerColumnToClient(actualCol),
                    message: validatedBp.cspyBp.description,
                    source,
                });
            } else {
                results.push({ // The breakpoint failed to set (threw an exception)
                    verified: false,
                    line: dapBp.line,
                    column: dapBp.column,
                    source,
                });
            }
        });
        this.knownBreakpoints.set(sourcePath, knownBreakpoints);

        return results;
    }

    /**
     * Whether the current driver supports setting a {@link BreakpointType} (using the methods below)
     */
    supportsBreakpointTypes() {
        return this.bpDescriptorFactory instanceof EmulCodeBreakpointDescriptorFactory;
    }

    setBreakpointType(type: BreakpointType) {
        if (this.bpDescriptorFactory instanceof EmulCodeBreakpointDescriptorFactory) {
            let bpType: EmulCodeBreakpointType;
            switch (type) {
            case BreakpointType.AUTO:
                bpType = EmulCodeBreakpointType.kDriverDefaultBreakpoint;
                break;
            case BreakpointType.HARDWARE:
                bpType = EmulCodeBreakpointType.kDriverHardwareBreakpoint;
                break;
            case BreakpointType.SOFTWARE:
                bpType = EmulCodeBreakpointType.kDriverSoftwareBreakpoint;
                break;
            default:
                bpType = EmulCodeBreakpointType.kDriverDefaultBreakpoint;
                break;
            }
            this.bpDescriptorFactory.type = bpType;
        }
    }

    dispose(): void {
        this.breakpointService.dispose();
    }

    private parseSourceUle(ule: string): [path: string, line: number, col: number] {
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

    private static bpsEqual(bp1: DebugProtocol.SourceBreakpoint, bp2: DebugProtocol.SourceBreakpoint): boolean {
        return bp1.line === bp2.line &&
            bp1.column === bp2.column &&
            bp1.condition === bp2.condition &&
            bp1.hitCondition === bp2.hitCondition &&
            bp1.logMessage === bp2.logMessage;
    }
}