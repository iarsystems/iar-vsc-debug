/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Path from "path";
import { logger } from "@vscode/debugadapter";
import { LogLevel } from "@vscode/debugadapter/lib/logger";
import { IarOsUtils } from "iar-vsc-common/osUtils";
import { DEBUGGER_SERVICE } from "iar-vsc-common/thrift/bindings/cspy_types";
import { ProcessMonitor, ThriftServiceRegistryProcess } from "iar-vsc-common/thrift/thriftServiceRegistryProcess";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";

export namespace CSpyServerLauncher {

    /**
     * Starts CSpyServer using the given workbench, and returns a {@link ThriftServiceRegistryProcess} which can be used to
     * communicate with the CSpyServer process.
     */
    export function fromWorkbench(workbenchPath: string, numCores: number): Promise<ThriftServiceRegistryProcess> {
        const cspyServerPath = Path.join(workbenchPath, "common/bin/CSpyServer2" + IarOsUtils.executableExtension());
        const args = ["-standalone", "-sockets"];
        if (numCores > 1) {
            args.push(`--multicore_nr_of_cores=${numCores}`);
        }
        const processMonitor: ProcessMonitor = {
            stdout: data => logger.verbose(data),
            stderr: data => logger.error(data),
            exit:   code => logger.log(`CSpyServer exited with code ${code}`, code === 0 ? LogLevel.Verbose : LogLevel.Error),
        };
        const stopCspyService = async function(registry: ThriftServiceRegistry) {
            const dbgr = await registry.findService(DEBUGGER_SERVICE, Debugger);
            await dbgr.service.exit();
            dbgr.close();
        };
        return ThriftServiceRegistryProcess.launch(cspyServerPath, args, stopCspyService, DEBUGGER_SERVICE, processMonitor);
    }
}
