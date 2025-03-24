/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as Breakpoints from "iar-vsc-common/thrift/bindings/Breakpoints";
import { DebugProtocol } from "@vscode/debugprotocol";
import * as Thrift from "iar-vsc-common/thrift/bindings/shared_types";
import { Disposable } from "../utils";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { BREAKPOINTS_SERVICE } from "iar-vsc-common/thrift/bindings/breakpoints_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { DescriptorWriter } from "./descriptors/descriptorWriter";
import { CSpyDriver } from "./cspyDriver";
import { logger } from "@vscode/debugadapter/lib/logger";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";
import { BreakpointDescriptor } from "./descriptors/breakpointDescriptor";
import { CodeBreakpointMode } from "./breakpointMode";
import { AccessType } from "./descriptors/accessType";
import { OutputEvent } from "@vscode/debugadapter";

// A breakpoint which has been set in the cspy backend (it isn't necessary valid, just validated and known in the backend)
interface InstalledBreakpoint<Bp> {
    dapBp: Bp;
    cspyBp: Thrift.Breakpoint;
}
type InstalledSourceBreakpoint = InstalledBreakpoint<DebugProtocol.SourceBreakpoint>;
type InstalledInstructionBreakpoint = InstalledBreakpoint<DebugProtocol.InstructionBreakpoint>;
type InstalledDataBreakpoint = InstalledBreakpoint<DebugProtocol.DataBreakpoint>;

/**
 * Sets, unsets and verifies C-SPY breakpoints.
 */
export class CSpyBreakpointService implements Disposable.Disposable {

    /**
     * Creates and returns a new breakpoint manager
     * @param serviceRegistry The service manager handling the debug session
     * @param driver The driver running the debug session
     */
    static async instantiate(serviceRegistry: ThriftServiceRegistry,
        clientLinesStartAt1: boolean,
        clientColumnsStartAt1: boolean,
        driver: CSpyDriver,
        eventSink: (event: OutputEvent) => void): Promise<CSpyBreakpointService> {
        return new CSpyBreakpointService(
            await serviceRegistry.findService(BREAKPOINTS_SERVICE, Breakpoints.Client),
            clientLinesStartAt1,
            clientColumnsStartAt1,
            driver,
            eventSink
        );
    }

    // Stores all installed cspy breakpoints for all files, together with the DAP
    // breakpoint that set them.
    // Lets us figure out when a bp is added or removed in the frontend,
    // even though this information is not explicitly given to us via DAP.
    private readonly installedSourceBreakpoints: Map<string, Array<InstalledSourceBreakpoint>> = new Map();
    private readonly installedInstrunctionBreakpoints: Array<InstalledInstructionBreakpoint> = [];
    private readonly installedDataBreakpoints: Array<InstalledDataBreakpoint> = [];

    private defaultCodeBreakpointMode: CodeBreakpointMode;

    private constructor(private readonly breakpointService: ThriftClient<Breakpoints.Client>,
        private readonly clientLinesStartAt1: boolean,
        private readonly clientColumnsStartAt1: boolean,
        private readonly driver: CSpyDriver,
        private readonly eventSink: (event: OutputEvent) => void) {
        this.defaultCodeBreakpointMode = this.supportedCodeBreakpointModes()[0] ?? CodeBreakpointMode.Auto;
    }

    /**
     * Sets breakpoints for some source file, and removes all other breakpoints in the file.
     * @param source The source file to set breakpoints for
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setBreakpointsFor(source: DebugProtocol.Source, dapBps: DebugProtocol.SourceBreakpoint[]): Promise<[DebugProtocol.Breakpoint[], DebugProtocol.SourceBreakpoint[]]> {
        if (!source.path) {
            return Promise.reject(new Error("Cannot set breakpoints without a path"));
        }

        const installedBreakpoints: InstalledSourceBreakpoint[] = this.installedSourceBreakpoints.get(source.path) ?? [];
        const bpResults = await this.setBreakpointsAsNeeded(
            dapBps,
            installedBreakpoints,
            CSpyBreakpointService.sourceBpsEqual,
            (dapBp => { // Constructs descriptor for a breakpoint
                const dbgrLine = this.convertClientLineToDebugger(dapBp.line);
                const dbgrCol = dapBp.column ? this.convertClientColumnToDebugger(dapBp.column) : 1;
                const ule = `{${source.path}}.${dbgrLine}.${dbgrCol}`;
                if (dapBp.logMessage) {
                    return this.driver.logBreakpointFactory.createOnUle(ule, dapBp.logMessage.trim());
                } else {
                    let mode = this.defaultCodeBreakpointMode;
                    if (dapBp.mode && Object.values<string>(CodeBreakpointMode).includes(dapBp.mode)) {
                        mode = dapBp.mode as CodeBreakpointMode;
                    }
                    const descriptorFactory = this.driver.codeBreakpointFactories[mode];
                    if (descriptorFactory) {
                        return descriptorFactory.createOnUle(ule);
                    }
                    return `The driver does not support breakpoint mode '${mode}'`;
                }
            }),
        );
        this.installedSourceBreakpoints.set(source.path, installedBreakpoints);

        // Map the requested BPs to a DAP result format
        return [bpResults.setBp.map(([dapBp, result]) => {
            if (typeof (result) === "string") {
                return {
                    verified: false,
                    line: dapBp.line,
                    column: dapBp.column,
                    message: result,
                    source,
                };
            } else {
                let actualLine = dapBp.line;
                let actualCol = dapBp.column;
                try {
                    if (result.isUleBased) {
                        [, actualLine, actualCol] = this.parseSourceUle(result.ule);
                        actualLine = this.convertDebuggerLineToClient(actualLine);
                        actualCol = this.convertDebuggerColumnToClient(actualCol);
                    }
                } catch (_) { }
                return {
                    verified: result.valid,
                    line: actualLine,
                    column: actualCol,
                    message: result.description,
                    source,
                };
            }
        }), bpResults.failedRemovals];
    }

    /**
     * Sets instruction breakpoints at the given addresses, and removes any other instruction breakpoints.
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setInstructionBreakpoints(dapBps: DebugProtocol.InstructionBreakpoint[]): Promise<[DebugProtocol.Breakpoint[], DebugProtocol.InstructionBreakpoint[]]> {
        const bpResults = await this.setBreakpointsAsNeeded(
            dapBps,
            this.installedInstrunctionBreakpoints,
            CSpyBreakpointService.instructionBpsEqual,
            (dapBp => { // Constructs descriptor for a breakpoint
                let address = dapBp.instructionReference;
                if (dapBp.offset) {
                    address = `0x${(BigInt(address) + BigInt(dapBp.offset)).toString(16)}`;
                }

                let mode = this.defaultCodeBreakpointMode;
                if (dapBp.mode && Object.values<string>(CodeBreakpointMode).includes(dapBp.mode)) {
                    mode = dapBp.mode as CodeBreakpointMode;
                }
                const descriptorFactory = this.driver.codeBreakpointFactories[mode];
                if (descriptorFactory) {
                    return descriptorFactory.createOnUle(address);
                }
                return `The driver does not support breakpoint mode '${mode}'`;
            }),
        );

        // Map the requested BPs to a DAP result format, using data from each cspy BP
        return [bpResults.setBp.map(([dapBp, result]) => {
            if (typeof (result) === "string") {
                return {
                    verified: false,
                    instructionReference: dapBp.instructionReference,
                    message: result,
                };
            } else {
                return {
                    verified: result.valid,
                    instructionReference: result.ule,
                    message: result.description,
                };
            }
        }), bpResults.failedRemovals];
    }

    /**
     * Sets data breakpoints at the given addresses, and removes any other data breakpoints.
     * @param dapBps The breakpoints to set
     * @returns The actual BPs set, in the same order as input
     */
    async setDataBreakpoints(dapBps: DebugProtocol.DataBreakpoint[]): Promise<[DebugProtocol.Breakpoint[], DebugProtocol.DataBreakpoint[]]> {
        const bpResults = await this.setBreakpointsAsNeeded(
            dapBps,
            this.installedDataBreakpoints,
            CSpyBreakpointService.dataBpsEqual,
            dapBp => { // Constructs descriptor for a breakpoint
                if (!this.driver.dataBreakpointFactory) {
                    return "The driver does not support data breakpoints";
                }
                const accessType = CSpyBreakpointService.dapAccessTypeToThriftAccessType(dapBp.accessType ?? "readWrite");
                // The dataId is a memory address, so we can use it as the ule
                return this.driver.dataBreakpointFactory.createOnUle(dapBp.dataId, accessType);
            });

        return [bpResults.setBp.map(([dapBp, result]) => {
            if (typeof (result) === "string") {
                return {
                    verified: true,
                    instructionReference: dapBp.dataId,
                    message: result,
                };
            } else {
                return {
                    verified: result.valid,
                    instructionReference: result.ule || dapBp.dataId,
                    message: result.description,
                    mode: "data",
                };
            }
        }), bpResults.failedRemovals];
    }

    /**
     * The supported {@link CodeBreakpointMode}s that can be set using the method below.
     */
    supportedCodeBreakpointModes(): CodeBreakpointMode[] {
        return Object.keys(this.driver.codeBreakpointFactories) as Array<
            keyof typeof this.driver.codeBreakpointFactories
        >;
    }

    /**
     * Sets the mode to use for source & instruction breakpoints which do not
     * have an explicit mode set on them.
     */
    setDefaultCodeBreakpointMode(mode: CodeBreakpointMode) {
        this.defaultCodeBreakpointMode = mode;
    }

    /**
     * The supported access types that can be used when setting data breakpoints
     */
    supportedDataBreakpointAccessTypes(): DebugProtocol.DataBreakpointAccessType[] {
        return this.driver.dataBreakpointFactory?.getSupportedAccessTypes()?.
            map(CSpyBreakpointService.thriftAccessTypeToDapAccessType) ?? [];
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
     * @param toDescriptor Converts a DAP breakpoint to a breakpoint descriptor, or returns an error string. Common descriptor properties (condition & skipCount) will be filled in by this function.
     * @returns Each wanted breakpoint together with a result. The result is a corresponding C-SPY breakpoint set in the
     *      backend, or a string error message.
     */

    private async setBreakpointsAsNeeded<DapBp extends DebugProtocol.SourceBreakpoint | DebugProtocol.InstructionBreakpoint | DebugProtocol.DataBreakpoint>(
        wantedBreakpoints: DapBp[],
        installedBreakpoints: InstalledBreakpoint<DapBp>[],
        bpsEqual: (bp1: DapBp, bp2: DapBp) => boolean,
        toDescriptor: (bp: DapBp) => BreakpointDescriptor | string): Promise<ResultingBreakpoints<DapBp>> {


        // We want to avoid clearing and recreating breakpoints which haven't changed since the last call.
        // We first figure out which bps have been removed in the frontend, and remove them
        const bpsToRemove = installedBreakpoints.filter(installedBp => !wantedBreakpoints.some(wantedBp => bpsEqual(installedBp.dapBp, wantedBp)));
        bpsToRemove.forEach(bp => installedBreakpoints.splice(installedBreakpoints.indexOf(bp), 1));

        const missingBps: DapBp[] = [];
        await Promise.allSettled(bpsToRemove.map(async bp => {
            if (!await this.breakpointService.service.removeBreakpoint(bp.cspyBp.id)) {
                missingBps.push(bp.dapBp);
                this.eventSink(new OutputEvent(`Failed to remove breakpoint: ${bp.cspyBp.ule}`, "stderr"));
            }
        }));

        const resultingBreakpoints: ResultingBreakpoints<DapBp> = {
            failedRemovals: missingBps,
            setBp: [],
        };

        resultingBreakpoints.setBp = await Promise.all(wantedBreakpoints.map(async wantedBp => {
            const makeError = (msg: string): [DapBp, string] => [wantedBp, msg];

            const existingBp = installedBreakpoints.find(installedBp => bpsEqual(installedBp.dapBp, wantedBp));
            if (existingBp) {
                return [wantedBp, existingBp.cspyBp];
            }

            const descriptor = toDescriptor(wantedBp);
            if (typeof descriptor === "string") {
                return makeError(descriptor);
            }
            if ((wantedBp.condition || wantedBp.hitCondition) && !(descriptor instanceof LocEtcDescriptor)) {
                return makeError("The driver does not support conditional breakpoints of this type");
            }
            if (descriptor instanceof LocEtcDescriptor) {
                if (wantedBp.condition) {
                    descriptor.condition = wantedBp.condition;
                }
                if (wantedBp.hitCondition) {
                    const skipCount = Number(wantedBp.hitCondition);
                    if (!(skipCount >= 0)) {
                        return makeError("The hit count must be a number greater than or equal to 0.");
                    }
                    descriptor.skipCount = skipCount;
                }
            }

            const writer = new DescriptorWriter();
            descriptor.serialize(writer);
            try {
                logger.verbose("Setting breakpoint: " + writer.result);
                const cspyBp = await this.breakpointService.service.setBreakpointFromDescriptor(writer.result);
                installedBreakpoints.push({ cspyBp, dapBp: wantedBp });
                return [wantedBp, cspyBp];
            } catch (e) {
                if (e instanceof Error || typeof(e) === "string") {
                    logger.error(e.toString());
                    return makeError(e.toString());
                }
                return makeError("An unknown error occured");
            }
        }));
        return resultingBreakpoints;
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
            bp1.mode === bp2.mode &&
            bp1.condition === bp2.condition &&
            bp1.hitCondition === bp2.hitCondition &&
            bp1.logMessage === bp2.logMessage;
    }
    private static instructionBpsEqual(bp1: DebugProtocol.InstructionBreakpoint, bp2: DebugProtocol.InstructionBreakpoint): boolean {
        return bp1.instructionReference === bp2.instructionReference &&
            bp1.offset === bp2.offset &&
            bp1.mode === bp2.mode &&
            bp1.condition === bp2.condition &&
            bp1.hitCondition === bp2.hitCondition;
    }
    private static dataBpsEqual(bp1: DebugProtocol.DataBreakpoint, bp2: DebugProtocol.DataBreakpoint): boolean {
        return bp1.dataId === bp2.dataId &&
            bp1.accessType === bp2.accessType &&
            bp1.condition === bp2.condition &&
            bp1.hitCondition === bp2.hitCondition;
    }

    private static dapAccessTypeToThriftAccessType(dapAccessType: DebugProtocol.DataBreakpointAccessType): AccessType {
        switch (dapAccessType) {
            case "read":
                return AccessType.Read;
            case "write":
                return AccessType.Write;
            case "readWrite":
                return AccessType.ReadWrite;
        }
        logger.warn("Dap to cspy access mapping is not exhaustive!");
        return AccessType.ReadWrite;
    }
    private static thriftAccessTypeToDapAccessType(thriftAccessType: AccessType): DebugProtocol.DataBreakpointAccessType {
        switch (thriftAccessType) {
            case AccessType.Read:
                return "read";
            case AccessType.Write:
                return "write";
            case AccessType.ReadWrite:
                return "readWrite";
        }
        logger.warn("Cspy to dap access mapping is not exhaustive!");
        return "readWrite";
    }
}
