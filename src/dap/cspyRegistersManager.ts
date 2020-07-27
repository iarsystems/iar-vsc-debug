"use strict";

import * as ListWindowBackend from "./thrift/bindings/ListWindowBackend";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import { Disposable } from "./disposable";
import { Variable } from "vscode-debugadapter";
import { ListWindowClient } from "./listWindowClient";

/**
 * Retrieves register names and values from C-SPY.
 *
 * To do so, we have to pretend to be a register window,
 * hence the need for a dedicated class.
 */
export class CSpyRegistersManager implements Disposable {
    private static readonly WINDOW_NAME = "WIN_REGISTER_1";

    static async instantiate(serviceMgr: ThriftServiceManager): Promise<CSpyRegistersManager> {
        const backend = await serviceMgr.findService(CSpyRegistersManager.WINDOW_NAME, ListWindowBackend.Client);
        const frontend = new ListWindowClient(backend, this.WINDOW_NAME);
        await frontend.initialize(serviceMgr);
        await backend.service.show(true);
        return new CSpyRegistersManager(frontend);
    }

    private constructor(private windowClient: ListWindowClient) {
    }

    /**
     * Gets all CPU registers and values as debug adapter variables
     */
    async getRegisters(): Promise<Variable[]> {
        const rows = this.windowClient.rows;
        rows.forEach(row => {
            console.log(row.treeinfo);
        });

        return rows.map((row, index) => {
            return new Variable(
                row.cells[0].text,
                row.cells[1].text,
                );
        });
    }

    async getRegistersSubTree(index: number) {
        return [new Variable("SUBREG", "0x00000000")];
    }

    async dispose(): Promise<void> {
        await this.windowClient.dispose();
    }
}