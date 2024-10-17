/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { DEBUGGER_SERVICE } from "iar-vsc-common/thrift/bindings/cspy_types";
import { Mutex } from "async-mutex";
import Int64 = require("node-int64");
import { ListWindowClient } from "../listWindowClient";
import { WindowNames } from "../listWindowConstants";
import { Disposable } from "../utils";

/**
 * Allows running actions on specific cores in a multi-core session. Call ${@link performOnCore} to run an action in the
 * context of some core.
 *
 * Since C-SPY only has a single globally "active" core at a time, we need to take care that actions that change the
 * active core do not interfere with each other. This service allows atomically changing the active core and performing
 * some action with the new active core. All context-sensitive actions should use this service to make sure they are
 * done on the correct core.
 */
export class CSpyCoresService implements Disposable.Disposable {
    /**
     * Creates a new cores service from the given service manager instance. Note that there should only be one
     * {@link CSpyCoresService} instance per debug session/service manager (since it needs to be the single authority on
     * what core is focused).
     */
    static async instantiate(serviceRegistry: ThriftServiceRegistry): Promise<CSpyCoresService> {
        const dbgr = await serviceRegistry.findService(DEBUGGER_SERVICE, Debugger);
        const nCores = await dbgr.service.getNumberOfCores();
        dbgr.close();
        // We don't need the cores window if we're running single-core. This lets us support single-core debugging
        // when the cores window is unavailable (i.e. for some 8.X ide versions).
        const coresWindow = nCores > 1 ? await ListWindowClient.instantiate(serviceRegistry, WindowNames.CORES, 1) : undefined;
        return new CSpyCoresService(coresWindow);
    }

    private readonly mutex = new Mutex();

    private constructor(
        private readonly coresWindow: ListWindowClient | undefined,
    ) { }

    /**
     * Runs a task in the context of the given core. This changes the base context of the debugger to the given core.
     * @param core The id of the core to activate
     * @param task The task to perform
     * @returns The return value of the task
     */
    performOnCore<T>(core: number, task: () => Promise<T>): Promise<T> {
        if (this.coresWindow) {
            return this.mutex.runExclusive(async() => {
                await this.setActionsAffectAllCores(false);
                // TODO: cache state to avoid doing this every time
                await this.coresWindow?.doubleClickRow(new Int64(core), 0);
                return task();
            });
        } else {
            // We don't have a core window when we're single-core, but there's no need for mutual exclusion if the
            // active core cannot be changed.
            return task();
        }
    }

    /**
     * Runs a task with the debugger instructed to perform step and other run control actions on *all* cores, not just
     * the active one. Note that this only affects debugger actions that do not take an explicit context or core (e.g.
     * the step/stepOut/stepIn actions). Other actions, such as goCore, are not affected.
     * @param task The task to perform
     * @returns The return value of the task
     */
    performOnAllCores<T>(task: () => Promise<T>): Promise<T> {
        if (this.coresWindow) {
            return this.mutex.runExclusive(async() => {
                await this.setActionsAffectAllCores(true);
                return task();
            });
        } else {
            return task();
        }
    }

    async dispose() {
        await this.coresWindow?.dispose();
    }

    private async setActionsAffectAllCores(actionsAffectAllCores: boolean) {
        // TODO: cache state to avoid doing this every time
        if (this.coresWindow) {
            const contextmenu = await this.coresWindow?.getContextMenu(new Int64(0), 0);
            const targetText = actionsAffectAllCores ? "affect all" : "affect current";
            const targetItem = contextmenu?.find(item => item.text.includes(targetText));
            if (!targetItem) {
                throw new Error("Could not find context menu item for setting multicore run/step behaviour");
            }
            await this.coresWindow?.clickContextMenu(targetItem.command);
        }
    }
}
