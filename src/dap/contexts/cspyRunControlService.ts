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
    private readonly expectedStoppingReason: Map<number, StoppingReason> = new Map();

    private constructor(
        private readonly dbgr: ThriftClient<Debugger.Client>,
        private readonly nCores: number,
        eventListener: DebugEventListenerHandler,
        libSupportHandler: LibSupportHandler,
    ) {
        eventListener.observeDebugEvents(DkNotifyConstant.kDkCoreStarted, this.updateCoreStatus.bind(this));
        eventListener.observeDebugEvents(DkNotifyConstant.kDkCoreStopped, this.updateCoreStatus.bind(this));
        eventListener.observeDebugEvents(DkNotifyConstant.kDkReset, this.updateCoreStatus.bind(this));

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
    next(core: number, granularity: DebugProtocol.NextArguments["granularity"]) {
        return CSpyCoresService.instance.performOnCore(core, async() => {
            this.expectedStoppingReason.set(core, "step");
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
    stepIn(core: number, granularity: DebugProtocol.StepInArguments["granularity"]) {
        return CSpyCoresService.instance.performOnCore(core, async() => {
            this.expectedStoppingReason.set(core, "step");
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
    stepOut(core: number) {
        return CSpyCoresService.instance.performOnCore(core, async() => {
            this.expectedStoppingReason.set(core, "step");
            await this.dbgr.service.stepOut();
        });
    }

    /**
     * See https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Continue
     */
    continue(core: number, singleThread: boolean) {
        return CSpyCoresService.instance.performOnCore(core, async() => {
            if (singleThread) {
                this.expectedStoppingReason.set(core, "breakpoint");
                await this.dbgr.service.goCore(core);
            } else {
                for (let core = 0; core < this.nCores; core++) {
                    if (!this.expectedStoppingReason.has(core)) {
                        this.expectedStoppingReason.set(core, "breakpoint");
                    }
                }
                await this.dbgr.service.multiGo(-1);
            }
        });
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

    runToULE(core: number, ule: string) {
        return CSpyCoresService.instance.performOnCore(core, async() => {
            await this.dbgr.service.runToULE(ule, false);
        });
    }

    async reset() {
        for (let i = 0; i < this.nCores; i++) {
            this.expectedStoppingReason.set(i, "entry");
        }
        await this.dbgr.service.reset();
        // TODO: we should implement some startup behaviour here (e.g. run to main)
    }

    dispose() {
        this.dbgr.close();
    }

    private async updateCoreStatus() {
        const nCores = await this.dbgr.service.getNumberOfCores();
        for (let i = 0; i < nCores; i++) {
            const isStopped = (await this.dbgr.service.getCoreState(i)) !== DkCoreStatusConstants.kDkCoreStateRunning;
            if (isStopped) {
                const expectedStoppingReason = this.expectedStoppingReason.get(i);
                const wasStopped = expectedStoppingReason === undefined;
                if (!wasStopped) {
                    this.expectedStoppingReason.delete(i);
                    this.coreStoppedCallbacks.forEach(cb => cb(i, expectedStoppingReason));
                }
            }
        }
    }
}