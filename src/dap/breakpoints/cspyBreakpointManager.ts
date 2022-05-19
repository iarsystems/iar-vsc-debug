/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as Breakpoints from "iar-vsc-common/thrift/bindings/Breakpoints";
import { DebugProtocol } from "@vscode/debugprotocol";
import * as Thrift from "iar-vsc-common/thrift/bindings/shared_types";
import { Disposable } from "../disposable";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import { BREAKPOINTS_SERVICE } from "iar-vsc-common/thrift/bindings/breakpoints_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { DescriptorWriter } from "./descriptors/descriptorWriter";
import { CSpyDriver } from "./cspyDriver";
import { CodeBreakpointDescriptorFactory, EmulCodeBreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { EmulCodeBreakpointType } from "./descriptors/emulCodeBreakpointDescriptor";
import { logger } from "@vscode/debugadapter/lib/logger";


/**
 * Different types of breakpoints, only applicable to some drivers.
 * In practice these map to EmulCodeBreakpointType, but we want to hide that relation.
 */
export enum BreakpointType {
    AUTO = "auto", HARDWARE = "hardware", SOFTWARE = "software"
}

// A breakpoint which has been set in the cspy backend (it isn't necessary valid, just validated and known in the backend)
interface InstalledBreakpoint<Bp> {
    dapBp: Bp;
    cspyBp: Thrift.Breakpoint;
}
type InstalledSourceBreakpoint = InstalledBreakpoint<DebugProtocol.SourceBreakpoint>;
type InstalledInstructionBreakpoint = InstalledBreakpoint<DebugProtocol.InstructionBreakpoint>;

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

    // Stores all installed cspy breakpoints for all files, together with the DAP
    // breakpoint that set them.
    // Lets us figure out when a bp is added or removed in the frontend,
    // even though this information is not explicitly given to us via DAP.
    private readonly installedSourceBreakpoints: Map<string, Array<InstalledSourceBreakpoint>> = new Map();
    private installedInstrunctionBreakpoints: Array<InstalledInstructionBreakpoint> = [];

    // Holds driver-specific bp creation logic
    private readonly bpDescriptorFactory: CodeBreakpointDescriptorFactory;

    private constructor(private readonly breakpointService: ThriftClient<Breakpoints.Client>,
                private readonly clientLinesStartAt1: boolean,
                private readonly clientColumnsStartAt1: boolean,
                driver: CSpyDriver) {
        this.bpDescriptorFactory = driver.getCodeBreakpointDescriptorFactory();
    }

    /**
     * Sets breakpoints for some source file, and removes all other breakpoints in the file.
     * @param source The source file to set breakpoints for
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setBreakpointsFor(source: DebugProtocol.Source, dapBps: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        if (!source.path) {
            return Promise.reject(new Error("Cannot set breakpoints without a path"));
        }

        const sourcePath = source.path;

        const installedBreakpoints: InstalledSourceBreakpoint[] = this.installedSourceBreakpoints.get(sourcePath) ?? [];
        await this.setBreakpointsAsNeeded(
            dapBps,
            installedBreakpoints,
            CSpyBreakpointManager.sourceBpsEqual,
            (dapBp => { // Constructs ule for a breakpoint
                const dbgrLine = this.convertClientLineToDebugger(dapBp.line);
                const dbgrCol = dapBp.column ? this.convertClientColumnToDebugger(dapBp.column) : 1;
                return `{${sourcePath}}.${dbgrLine}.${dbgrCol}`;
            }),
        );

        // Map the requested BPs to a DAP result format
        const results: DebugProtocol.Breakpoint[] = [];
        dapBps.forEach(dapBp => {
            const installedBp = installedBreakpoints.find(bp => CSpyBreakpointManager.sourceBpsEqual(bp.dapBp, dapBp));
            if (installedBp !== undefined && installedBp.cspyBp.valid) {
                const descriptor = this.bpDescriptorFactory.createFromString(installedBp.cspyBp.descriptor);
                const [, actualLine, actualCol] = this.parseSourceUle(descriptor.ule);
                results.push({
                    verified: true,
                    line: this.convertDebuggerLineToClient(actualLine),
                    column: this.convertDebuggerColumnToClient(actualCol),
                    message: installedBp.cspyBp.description,
                    source,
                });
            } else {
                results.push({ // The breakpoint failed to install
                    verified: false,
                    line: dapBp.line,
                    column: dapBp.column,
                    source,
                });
            }
        });
        this.installedSourceBreakpoints.set(sourcePath, installedBreakpoints);

        return results;
    }

    /**
     * Sets instruction breakpoints at the given addresses, and removes any other instruction breakpoints.
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setInstructionBreakpointsFor(dapBps: DebugProtocol.InstructionBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        const installedBreakpoints: InstalledInstructionBreakpoint[] = this.installedInstrunctionBreakpoints;
        await this.setBreakpointsAsNeeded(
            dapBps,
            installedBreakpoints,
            CSpyBreakpointManager.instructionBpsEqual,
            (dapBp => { // Constructs ule for a breakpoint
                let address = dapBp.instructionReference;
                if (dapBp.offset) {
                    address = `0x${(BigInt(address) + BigInt(dapBp.offset)).toString(16)}`;
                }
                return address;
            }),
        );

        // Map the requested BPs to a DAP result format, using data from each cspy BP
        const results: DebugProtocol.Breakpoint[] = [];
        dapBps.forEach(dapBp => {
            const installed = installedBreakpoints.find(bp => CSpyBreakpointManager.instructionBpsEqual(bp.dapBp, dapBp));
            if (installed !== undefined && installed.cspyBp.valid) {
                results.push({
                    verified: true,
                    instructionReference: installed.cspyBp.ule,
                    message: installed.cspyBp.description,
                });
            } else {
                results.push({ // The breakpoint failed to set
                    verified: false,
                    instructionReference: dapBp.instructionReference,
                });
            }
        });
        this.installedInstrunctionBreakpoints = installedBreakpoints;

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

    getBreakpointType(): BreakpointType {
        if (this.bpDescriptorFactory instanceof EmulCodeBreakpointDescriptorFactory) {
            switch (this.bpDescriptorFactory.type) {
            case EmulCodeBreakpointType.kDriverDefaultBreakpoint:
                return BreakpointType.AUTO;
            case EmulCodeBreakpointType.kDriverHardwareBreakpoint:
                return BreakpointType.HARDWARE;
            case EmulCodeBreakpointType.kDriverSoftwareBreakpoint:
                return BreakpointType.SOFTWARE;
            default:
                return BreakpointType.AUTO;
                break;
            }
        } else {
            throw new Error("The driver does not support breakpoint types");
        }
    }

    dispose(): void {
        this.breakpointService.close();
    }

    /**
     * Sets and removes breakpoints as needed to ensure the installed breakpoints matches the wanted breakpoints.
     * Any known breakpoints that are not wanted are removed, and any wanted breakpoints that are not known are installed.
     * knownBreakpoints is edited in place so that after this operation, it contains the subset of wantedBreakpoints that
     * are actually installed (some wanted breakpoints may fail to install, and will this not be in the known breakpoints).
     * @param wantedBreakpoints The breakpoints we want to be set
     * @param installedBreakpoints The breakpoints currently set in the backend
     * @param bpsEqual Tells whether two breakpoints are equal
     * @param toUle Converts a DAP breakpoints to the cspy ULE it should be set on
     */
    private async setBreakpointsAsNeeded<DapBp>(wantedBreakpoints: DapBp[],
        installedBreakpoints: InstalledBreakpoint<DapBp>[],
        bpsEqual: (bp1: DapBp, bp2: DapBp) => boolean,
        toUle: (bp: DapBp) => string) {

        // We want to avoid clearing and recreating breakpoints which haven't changed since the last call.
        // We first figure out which bps have been removed in the frontend, and remove them
        const bpsToRemove = installedBreakpoints.filter(installedBp => !wantedBreakpoints.some(wantedBp => bpsEqual(installedBp.dapBp, wantedBp)) );
        bpsToRemove.forEach(bp => installedBreakpoints.splice(installedBreakpoints.indexOf(bp), 1) );
        await Promise.all(bpsToRemove.map(bp => this.breakpointService.service.removeBreakpoint(bp.cspyBp.id) ));

        const newBps = wantedBreakpoints.filter(wantedBp => !installedBreakpoints.some(installedBp => bpsEqual(installedBp.dapBp, wantedBp)));
        for (const dapBp of newBps) {
            const descriptor = this.bpDescriptorFactory.createOnUle(toUle(dapBp));

            const writer = new DescriptorWriter();
            descriptor.serialize(writer);
            try {
                const cspyBp = await this.breakpointService.service.setBreakpointFromDescriptor(writer.result);
                installedBreakpoints.push({ cspyBp, dapBp });
            } catch (e) {
                if (e instanceof Error || typeof(e) === "string") {
                    logger.error(e.toString());
                }
            }
        }
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

    private static sourceBpsEqual(bp1: DebugProtocol.SourceBreakpoint, bp2: DebugProtocol.SourceBreakpoint): boolean {
        return bp1.line === bp2.line &&
            bp1.column === bp2.column &&
            bp1.condition === bp2.condition &&
            bp1.hitCondition === bp2.hitCondition &&
            bp1.logMessage === bp2.logMessage;
    }

    private static instructionBpsEqual(bp1: DebugProtocol.InstructionBreakpoint, bp2: DebugProtocol.InstructionBreakpoint): boolean {
        return bp1.instructionReference === bp2.instructionReference &&
            bp1.offset === bp2.offset &&
            bp1.condition === bp2.condition &&
            bp1.hitCondition === bp2.hitCondition;
    }
}