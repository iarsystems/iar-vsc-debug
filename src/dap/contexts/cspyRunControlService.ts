/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { DebugEventListenerHandler } from "../debugEventListenerHandler";
import { ThriftServiceManager } from "../thrift/thriftServiceManager";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { DEBUGGER_SERVICE, DkCoreStatusConstants, DkNotifyConstant } from "iar-vsc-common/thrift/bindings/cspy_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { CSpyCoresService } from "./cspyCoresService";
import { DebugProtocol } from "@vscode/debugprotocol";
import { Disposable } from "../disposable";
import { LibSupportHandler } from "../libSupportHandler";

type StoppingReason = DebugProtocol.StoppedEvent["body"]["reason"];

/**
 * Keeps track of core states (running/stopped) and allows running/pausing/stepping cores.
 */
export class CSpyRunControlService implements Disposable {

    static async instantiate(
        serviceManager: ThriftServiceManager,
        eventListener: DebugEventListenerHandler,
        libSupportHandler: LibSupportHandler,
    ): Promise<CSpyRunControlService> {
        const dbgr = await serviceManager.findService(DEBUGGER_SERVICE, Debugger);
        return new CSpyRunControlService(dbgr, await dbgr.service.getNumberOfCores(), eventListener, libSupportHandler);
    }

    private readonly coreStoppedCallbacks: Array<(core: number, reason: StoppingReason) => void> = [];
    // For each running core, keeps the reason why the core would stop in the future. This depends on what action caused
    // the core to start (i.e. if we called stopCore on it, we expect it to stop with reason "pause"). When a core
    // stops (i.e. we receive a kDkCoreStopped), the reason stored here is sent to the DAP client (VS Code displays it
    // in the stack view).
    private readonly expectedStoppingReason: Map<number, StoppingReason> = new Map();

    private constructor(
        private readonly dbgr: ThriftClient<Debugger.Client>,
        private readonly nCores: number,
        eventListener: DebugEventListenerHandler,
        libSupportHandler: LibSupportHandler,
    ) {
        eventListener.observeDebugEvents(DkNotifyConstant.kDkCoreStopped, this.updateCoreStatus.bind(this));

        libSupportHandler.observeExit(() => {
            for (let i = 0; i < nCores; i++) {
                this.expectedStoppingReason.set(i, "exit");
            }
        });

        for (let i = 0; i < nCores; i++) {
            this.expectedStoppingReason.set(i, "entry");
        }
    }

    /**
     * Registers a function to be called when any core stops (e.g. because it hit a breakpoint or was stepped).
     * The callback function takes the index of the core and a reason for stopping that can be sent to the frontend.
     */
    onCoreStopped(callback: (core: number, reason: StoppingReason) => void) {
        this.coreStoppedCallbacks.push(callback);
    }

    /**
     * See https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Next
     */
    next(core: number | undefined, granularity: DebugProtocol.NextArguments["granularity"]) {
        return this.performOnOneOrAllCores(core, "step", async() => {
            if (granularity === "instruction") {
                await this.dbgr.service.instructionStepOver();
            } else {
                await this.dbgr.service.stepOver(false);
            }
        });
    }

    /**
     * See https://microsoft.github.io/debug-adapter-protocol/specification#Requests_StepIn
     */
    stepIn(core: number | undefined, granularity: DebugProtocol.StepInArguments["granularity"]) {
        return this.performOnOneOrAllCores(core, "step", async() => {
            if (granularity === "instruction") {
                await this.dbgr.service.instructionStep();
            } else {
                await this.dbgr.service.step(false);
            }
        });
    }

    /**
     * See https://microsoft.github.io/debug-adapter-protocol/specification#Requests_StepOut
     */
    stepOut(core: number | undefined) {
        return this.performOnOneOrAllCores(core, "step", async() => {
            await this.dbgr.service.stepOut();
        });
    }

    /**
     * See https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Continue
     */
    continue(core: number | undefined) {
        if (core !== undefined) {
            this.expectedStoppingReason.set(core, "breakpoint");
            return CSpyCoresService.instance.performOnCore(core, async() => {
                await this.dbgr.service.goCore(core);
            });
        } else {
            for (let i = 0; i < this.nCores; i++) {
                this.expectedStoppingReason.set(i, "breakpoint");
            }
            return CSpyCoresService.instance.performOnAllCores(async() => {
                await this.dbgr.service.multiGo(-1);
            });
        }
    }
    /**
     * See https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Pause
     */
    pause(core: number) {
        return CSpyCoresService.instance.performOnCore(core, async() => {
            this.expectedStoppingReason.set(core, "pause");
            await this.dbgr.service.stopCore(core);
        });
    }

    runToULE(core: number | undefined, ule: string) {
        return this.performOnOneOrAllCores(core, "entry", async() => {
            await this.dbgr.service.runToULE(ule, false);
        });
    }

    async reset() {
        await this.dbgr.service.reset();
        await this.runToULE(undefined, "main");
    }

    dispose() {
        this.dbgr.close();
    }

    /**
     * If core is defined, runs the task in the context if the core. Otherwise, runs the task for all cores.
     * Also sets the expected stopping reason for all affected cores.
     */
    private performOnOneOrAllCores<T>(core: number | undefined, expectedStoppingReason: string, task: () => Promise<T>) {
        if (core !== undefined) {
            this.expectedStoppingReason.set(core, expectedStoppingReason);
            return CSpyCoresService.instance.performOnCore(core, task);
        } else {
            for (let i = 0; i < this.nCores; i++) {
                this.expectedStoppingReason.set(i, expectedStoppingReason);
            }
            return CSpyCoresService.instance.performOnAllCores(task);
        }
    }

    private async updateCoreStatus() {
        const nCores = await this.dbgr.service.getNumberOfCores();
        const coreIds = Array.from({length: nCores}, (_, i) => i);
        return Promise.all(coreIds.map(async i => {
            const isStopped = (await this.dbgr.service.getCoreState(i)) !== DkCoreStatusConstants.kDkCoreStateRunning;
            console.log(`(${i}): ${isStopped}`);
            if (isStopped) {
                const expectedStoppingReason = this.expectedStoppingReason.get(i);
                const wasStopped = expectedStoppingReason === undefined;
                // Only if the core wasn't stopped last time we checked do we take any action.
                if (!wasStopped) {
                    this.expectedStoppingReason.delete(i);
                    this.coreStoppedCallbacks.forEach(cb => cb(i, expectedStoppingReason));
                }
            }
        }));
    }
}