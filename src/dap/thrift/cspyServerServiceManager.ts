/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Path from "path";
import { logger } from "@vscode/debugadapter";
import { LogLevel } from "@vscode/debugadapter/lib/logger";
import { IarOsUtils } from "iar-vsc-common/osUtils";
import { DEBUGGER_SERVICE } from "iar-vsc-common/thrift/bindings/cspy_types";
import { ProcessMonitor, ThriftServiceManager } from "iar-vsc-common/thrift/thriftServiceManager";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";

export namespace CSpyServerServiceManager {

    /**
     * Starts CSpyServer using the given workbench, and returns a {@link ThriftServiceManager} which can be used to
     * communicate with the CSpyServer process.
     */
    export function fromWorkbench(workbenchPath: string): Promise<ThriftServiceManager> {
        const cspyServerPath = Path.join(workbenchPath, "common/bin/CSpyServer2" + IarOsUtils.executableExtension());
        const args = ["-standalone", "-sockets"];
        const processMonitor: ProcessMonitor = {
            stdout: data => logger.verbose(data),
            stderr: data => logger.error(data),
            exit:   code => logger.log(`CSpyServer exited with code ${code}`, code === 0 ? LogLevel.Verbose : LogLevel.Error),
        };
        const stopCspyService = async function(manager: ThriftServiceManager) {
            const dbgr = await manager.findService(DEBUGGER_SERVICE, Debugger);
            await dbgr.service.exit();
            dbgr.close();
        };
        return ThriftServiceManager.launch(cspyServerPath, args, stopCspyService, DEBUGGER_SERVICE, processMonitor);
    }
}
