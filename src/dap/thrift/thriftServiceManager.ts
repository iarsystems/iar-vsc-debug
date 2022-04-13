/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Thrift from "thrift";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { ServiceLocation, Transport, Protocol } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";

import * as CSpyServiceRegistry from "iar-vsc-common/thrift/bindings/CSpyServiceRegistry";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { tmpdir } from "os";
import { Server, AddressInfo } from "net";
import { Disposable } from "../disposable";
import { DEBUGGER_SERVICE } from "iar-vsc-common/thrift/bindings/cspy_types";
import { IarOsUtils } from "iar-vsc-common/osUtils";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@vscode/debugadapter/lib/logger";

/**
 * Provides and manages a set of thrift services.
 */
export class ThriftServiceManager implements Disposable {
    private static readonly SERVICE_LOOKUP_TIMEOUT = 1000;
    private static readonly CSPYSERVER_EXIT_TIMEOUT = 15000;
    private readonly activeServers: Server[] = [];

    /**
     * Create a new service manager from the given service registry.
     * @param cspyProcess The CSpyServer process serving the service registry.
     * @param registryLocationPath The location of the service registry to use.
     */
    constructor(private readonly cspyProcess: ChildProcess, private readonly registryLocation: ServiceLocation) {
    }

    /**
     * Stops the service manager and all services created by it.
     * After this, the manager and its services are to be
     * considered invalid, and may not be used again.
     */
    async dispose() {
        // Since we're using cspyserver, we close the process from the debugger service
        // VSC-3 CSpyServer will stop the C-Spy session before exiting
        const dgbr = await this.findService(DEBUGGER_SERVICE, Debugger);
        await dgbr.service.exit();
        dgbr.close();
        this.activeServers.forEach(server => server.close());
        // Wait for cspyserver process to exit
        if (this.cspyProcess.exitCode === null) {
            await new Promise((resolve, reject) => {
                this.cspyProcess.on("exit", resolve);
                setTimeout(() => {
                    reject(new Error("CSpyServer exit timed out"));
                    this.cspyProcess.kill();
                }, ThriftServiceManager.CSPYSERVER_EXIT_TIMEOUT);
            });
        }
    }

    /**
     * Connects to a service with the given name. The service must already be started
     * (or in the process of starting), otherwise this method will reject.
     * @param serviceId The name to give the service
     * @param serviceType The type of service to register (usually given as the top-level import of the service module)
     */
    async findService<T>(serviceId: string, serviceType: Thrift.TClientConstructor<T>): Promise<ThriftClient<T>> {
        const registry = await this.getServiceAt(this.registryLocation, CSpyServiceRegistry);

        const location = await registry.service.waitForService(serviceId, ThriftServiceManager.SERVICE_LOOKUP_TIMEOUT);
        const service = await this.getServiceAt(location, serviceType);

        registry.close();

        return service;
    }

    /**
     * Start and register a new service in this service registry.
     * @param serviceId The name to give the service
     * @param serviceType The type of service to register (usually given as the top-level import of the service module)
     * @param handler The handler implementing the service
     * @typeParam Pr The processor type for the service, usually serviceType.Processor
     * @typeParam Ha The handler type for the service, usually object (thrift doesn't provide typescript types for service handlers)
     */
    async startService<Pr, Ha>(serviceId: string, serviceType: Thrift.TProcessorConstructor<Pr, Ha>, handler: Ha): Promise<ServiceLocation> {
        const serverOpt = {
            transport: Thrift.TBufferedTransport,
            protocol: Thrift.TBinaryProtocol,
        };
        const server = Thrift.createServer(serviceType, handler, serverOpt).
            on("error", err => logger.error(err.toString())).
            listen(0); // port 0 lets node figure out what to use

        const port = (server.address() as AddressInfo).port; // this cast is safe since we know it's an IP socket
        logger.verbose(`Starting service '${serviceId}' at port ${port}`);
        const location = new ServiceLocation({ host: "localhost", port: port, protocol: Protocol.Binary, transport: Transport.Socket });
        const registry = await this.getServiceAt(this.registryLocation, CSpyServiceRegistry);
        await registry.service.registerService(serviceId, location);

        this.activeServers.push(server);

        registry.close();
        return location;
    }

    private getServiceAt<T>(location: ServiceLocation, serviceType: Thrift.TClientConstructor<T>): Promise<ThriftClient<T>> {
        if (location.transport !== Transport.Socket) {
            return Promise.reject(new Error("Trying to connect to service with unsupported transport."));
        }
        const options: Thrift.ConnectOptions = {
            transport: Thrift.TBufferedTransport,
            protocol: location.protocol === Protocol.Binary ? Thrift.TBinaryProtocol : Thrift.TJSONProtocol,
        };
        return new Promise((resolve, reject) => {
            const conn = Thrift.createConnection(location.host, location.port, options).
                on("error", err => reject(err)).
                on("connect", () => {
                    const client = Thrift.createClient<T>(serviceType, conn);
                    resolve(new ThriftClient(conn, client));
                });
        });
    }
}

export namespace ThriftServiceManager {
    /**
     * Readies a service registry/manager and waits for it to finish starting before returning.
     * @param workbenchPath Path to the top-level folder of the workbench to use
     */
    export async function fromWorkbench(workbenchPath: string): Promise<ThriftServiceManager> {
        const registryPath = path.join(workbenchPath, "common/bin/CSpyServer2" + IarOsUtils.executableExtension());
        const tmpDir = getTmpDir();
        const serviceRegistryProcess = spawn(registryPath, ["-standalone", "-sockets"],
            { cwd: tmpDir });
        serviceRegistryProcess.stdout?.on("data", dat => {
            process.stdout.write(dat.toString());
        });
        serviceRegistryProcess.stderr?.on("data", dat => {
            logger.error(dat);
        });
        serviceRegistryProcess.on("exit", code => {
            logger.verbose("CSpyServer exited: " + code);
        });

        try {
            await waitUntilReady(serviceRegistryProcess);

            // Find the location of the service registry
            const locSerialized = fs.readFileSync(path.join(tmpDir, "CSpyServer2-ServiceRegistry.txt"));
            // These concats are a hack to create a valid thrift message. The thrift library seems unable to deserialize just a struct (at least for the json protocol)
            // Once could also do JSON.parse and manually convert it to a ServiceLocation, but this is arguably more robust
            const transport = new Thrift.TFramedTransport(Buffer.concat([Buffer.from("[1,0,0,0,"), locSerialized, Buffer.from("]")]));
            const prot = new Thrift.TJSONProtocol(transport);
            prot.readMessageBegin();
            const location = new ServiceLocation();
            location.read(prot);
            prot.readMessageEnd();

            return new ThriftServiceManager(serviceRegistryProcess, location);
        } catch (e) {
            serviceRegistryProcess.kill();
            throw e;
        }
    }

    // reads stdout as a hacky way to wait until cspyserver has launched
    // TODO: find a more robust way to detect when cspyserver is ready
    function waitUntilReady(process: ChildProcess): Promise<void> {
        return new Promise((resolve, reject) => {
            let output = "";
            const onData = (data: Buffer | string) => {
                output += data;
                if (output.includes("running")) {
                    logger.verbose("CSpyServer has launched.");
                    process.stdout?.removeListener("data", onData);
                    resolve();
                }
            };
            process.stdout?.on("data", onData);

            setTimeout(() => reject(new Error("Service registry launch timed out")), 10000);
        });
    }

    // Creates and returns a unique temporary directory.
    // This is used to store the bootstrap file created by CSpyServer2, to avoid conflicts if
    // several cspy processes are run at the same time.
    function getTmpDir(): string {
        // Generate a uuid-based name and place in /tmp or similar
        const tmpPath = path.join(tmpdir(), "iar-debug", uuidv4());
        if (!fs.existsSync(tmpPath)) {
            fs.mkdirSync(tmpPath, {recursive: true});
        }
        return tmpPath;
    }

}
