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
import { CodeBreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { logger } from "@vscode/debugadapter/lib/logger";
import { DescriptorReader } from "./descriptors/descriptorReader";
import { LocOnlyDescriptor } from "./descriptors/locOnlyDescriptor";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";


/**
 * Different types of breakpoints, not all drivers support all breakpoint types.
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
    private activeBpDescriptorFactory: CodeBreakpointDescriptorFactory;

    private constructor(private readonly breakpointService: ThriftClient<Breakpoints.Client>,
                private readonly clientLinesStartAt1: boolean,
                private readonly clientColumnsStartAt1: boolean,
                private readonly driver: CSpyDriver) {
        const defaultBpFactory = driver.codeBreakpointFactories.get(BreakpointType.AUTO) ??
            driver.codeBreakpointFactories.get(BreakpointType.HARDWARE) ??
            driver.codeBreakpointFactories.get(BreakpointType.SOFTWARE);
        if (defaultBpFactory === undefined) {
            throw new Error("The driver does not support any breakpoint types.");
        }
        this.activeBpDescriptorFactory = defaultBpFactory;
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
        const bpResults = await this.setBreakpointsAsNeeded(
            dapBps,
            installedBreakpoints,
            CSpyBreakpointManager.sourceBpsEqual,
            (dapBp => { // Constructs ule for a breakpoint
                const dbgrLine = this.convertClientLineToDebugger(dapBp.line);
                const dbgrCol = dapBp.column ? this.convertClientColumnToDebugger(dapBp.column) : 1;
                return `{${sourcePath}}.${dbgrLine}.${dbgrCol}`;
            }),
        );
        this.installedSourceBreakpoints.set(sourcePath, installedBreakpoints);

        // Map the requested BPs to a DAP result format
        return bpResults.map(([dapBp, result]) => {
            if (typeof(result) === "string") {
                return {
                    verified: false,
                    line: dapBp.line,
                    column: dapBp.column,
                    message: result,
                    source,
                };
            }
            if (result.valid) {
                const reader = new DescriptorReader(result.descriptor);
                const descriptor = new LocOnlyDescriptor(reader);
                const [, actualLine, actualCol] = this.parseSourceUle(descriptor.ule);
                return {
                    verified: true,
                    line: this.convertDebuggerLineToClient(actualLine),
                    column: this.convertDebuggerColumnToClient(actualCol),
                    message: result.description,
                    source,
                };
            } else {
                return { // The breakpoint failed to install
                    verified: false,
                    line: dapBp.line,
                    column: dapBp.column,
                    source,
                };
            }
        });
    }

    /**
     * Sets instruction breakpoints at the given addresses, and removes any other instruction breakpoints.
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setInstructionBreakpointsFor(dapBps: DebugProtocol.InstructionBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
        const installedBreakpoints: InstalledInstructionBreakpoint[] = this.installedInstrunctionBreakpoints;
        const bpResults = await this.setBreakpointsAsNeeded<DebugProtocol.InstructionBreakpoint>(
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
        this.installedInstrunctionBreakpoints = installedBreakpoints;

        // Map the requested BPs to a DAP result format, using data from each cspy BP
        return bpResults.map(([dapBp, result]) => {
            if (typeof(result) === "string") {
                return {
                    verified: true,
                    instructionReference: dapBp.instructionReference,
                    message: result,
                };
            }
            if (result.valid) {
                return {
                    verified: true,
                    instructionReference: result.ule,
                    message: result.description,
                };
            } else {
                return {
                    verified: false,
                    instructionReference: dapBp.instructionReference,
                };
            }
        });
    }

    /**
     * The supported {@link BreakpointType}s that can be set using the method below.
     */
    supportedBreakpointTypes() {
        return Array.from(this.driver.codeBreakpointFactories.keys());
    }

    /**
     * This is silently ignored if the type is not supported.
     */
    setBreakpointType(type: BreakpointType) {
        const bpFactory = this.driver.codeBreakpointFactories.get(type);
        if (bpFactory) {
            this.activeBpDescriptorFactory = bpFactory;
        } else {
            logger.error(`Tried to set BP type ${type}, but it is not supported by the driver.`);
        }
    }

    dispose(): void {
        this.breakpointService.close();
    }

    /**
     * Sets and removes breakpoints as needed to ensure the installed breakpoints match the wanted breakpoints.
     * Any known breakpoints that are not wanted are removed, and any wanted breakpoints that are not known are installed.
     * installedBreakpoints is edited in place so that after this operation, it contains the subset of wantedBreakpoints that
     * are actually installed (some wanted breakpoints may fail to install, and will thus not be in the installed breakpoints).
     * @param wantedBreakpoints The breakpoints we want to be set
     * @param installedBreakpoints The breakpoints currently set in the backend
     * @param bpsEqual Tells whether two breakpoints are equal
     * @param toUle Converts a DAP breakpoints to the cspy ULE it should be set on
     * @returns Each wanted breakpoint together with a result. The result is a corresponding C-SPY breakpoint set in the
     *      backend, or a string error message.
     */
    private async setBreakpointsAsNeeded<DapBp extends DebugProtocol.SourceBreakpoint | DebugProtocol.InstructionBreakpoint>(
        wantedBreakpoints: DapBp[],
        installedBreakpoints: InstalledBreakpoint<DapBp>[],
        bpsEqual: (bp1: DapBp, bp2: DapBp) => boolean,
        toUle: (bp: DapBp) => string): Promise<Array<[DapBp, Thrift.Breakpoint | string]>> {

        // We want to avoid clearing and recreating breakpoints which haven't changed since the last call.
        // We first figure out which bps have been removed in the frontend, and remove them
        const bpsToRemove = installedBreakpoints.filter(installedBp => !wantedBreakpoints.some(wantedBp => bpsEqual(installedBp.dapBp, wantedBp)) );
        bpsToRemove.forEach(bp => installedBreakpoints.splice(installedBreakpoints.indexOf(bp), 1) );
        await Promise.all(bpsToRemove.map(bp => this.breakpointService.service.removeBreakpoint(bp.cspyBp.id) ));

        return Promise.all(wantedBreakpoints.map(async wantedBp => {
            const existingBp = installedBreakpoints.find(installedBp => bpsEqual(installedBp.dapBp, wantedBp));
            if (existingBp) {
                return [wantedBp, existingBp.cspyBp];
            }

            const descriptor = this.activeBpDescriptorFactory.createOnUle(toUle(wantedBp));
            if ((wantedBp.condition || wantedBp.hitCondition) && !(descriptor instanceof LocEtcDescriptor)) {
                return [wantedBp, "The driver does not support conditional breakpoints of this type"];
            }
            if (descriptor instanceof LocEtcDescriptor) {
                if (wantedBp.condition) {
                    descriptor.condition = wantedBp.condition;
                }
                if (wantedBp.hitCondition) {
                    const skipCount = Number(wantedBp.hitCondition);
                    if (!(skipCount >= 0)) {
                        return [wantedBp, "The hit count must be a number greater than or equal to 0."];
                    }
                    descriptor.skipCount = skipCount;
                }
            }

            const writer = new DescriptorWriter();
            descriptor.serialize(writer);
            try {
                const cspyBp = await this.breakpointService.service.setBreakpointFromDescriptor(writer.result);
                installedBreakpoints.push({ cspyBp, dapBp: wantedBp });
                return [wantedBp, cspyBp];
            } catch (e) {
                if (e instanceof Error || typeof(e) === "string") {
                    logger.error(e.toString());
                    return [wantedBp, e.toString()];
                }
                return [wantedBp, "An unknown error occured"];
            }
        }));
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