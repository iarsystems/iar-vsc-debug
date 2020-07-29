/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Thrift from "thrift";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { ServiceLocation, Transport, Protocol } from "./bindings/ServiceRegistry_types";
import { ThriftClient } from "./thriftclient";

import * as CSpyServiceRegistry from "./bindings/CSpyServiceRegistry";
import * as Debugger from "./bindings/Debugger";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { Server, AddressInfo } from "net";
import { Disposable } from "../disposable";
import { DEBUGGER_SERVICE } from "./bindings/cspy_types";

/**
 * Provides and manages a set of thrift services.
 */
export class ThriftServiceManager implements Disposable {
    private static readonly SERVICE_LOOKUP_TIMEOUT = 1000;
    private readonly activeServers: Server[];

    /**
     * Create a new service manager from the given service registry.
     * @param registryLocationPath Path to a file containing a valid {@link ServiceLocation} pointing to a service registry
     */
    constructor(private registryLocationPath: fs.PathLike) {
    }

    /**
     * Stops the service manager and all services created by it.
     * After this, the manager and its services are to be
     * considered invalid, and may not be used again.
     */
    async dispose() {
        // Since we're using cspyserver, we close the process from the debugger service
        const dgbr = await this.findService(DEBUGGER_SERVICE, Debugger);
        await dgbr.service.exit();
        dgbr.dispose();
        this.activeServers.forEach(server => server.close());
    }

    /**
     * Connects to a service with the given name. The service must already be started
     * (or in the process of starting), otherwise this method will reject.
     * @param serviceId The name to give the service
     * @param serviceType The type of service to register (usually given as the top-level import of the service module)
     */
    async findService<T>(serviceId: string, serviceType: Thrift.TClientConstructor<T>): Promise<ThriftClient<T>> {
        const registry = await this.getServiceAt(this.getRegistryLocation(), CSpyServiceRegistry);

        const location = await registry.service.waitForService(serviceId, ThriftServiceManager.SERVICE_LOOKUP_TIMEOUT);
        const service = await this.getServiceAt(location, serviceType);
        console.log(await registry.service.getServices());

        registry.dispose();

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
        const server = Thrift.createServer(serviceType, handler, serverOpt)
            .on('error', console.log)
            .listen(0); // port 0 lets node figure out what to use

        const port = (server.address() as AddressInfo).port; // this cast is safe since we know it's an IP socket
        const location = new ServiceLocation({ host: "localhost", port: port, protocol: Protocol.Binary, transport: Transport.Socket });
        const registry = await this.getServiceAt(this.getRegistryLocation(), CSpyServiceRegistry);
        await registry.service.registerService(serviceId, location);

        registry.dispose();
        return location;
    }

    private getRegistryLocation(): ServiceLocation {
        const locSerialized = fs.readFileSync(this.registryLocationPath);

        // These concats are a hack to create a valid thrift message. The thrift library seems unable to deserialize just a struct (at least for the json protocol)
        // Once could also do JSON.parse and manually convert it to a ServiceLocation, but this is arguably more robust
        const transport = new Thrift.TFramedTransport(Buffer.concat([Buffer.from("[1,0,0,0,"), locSerialized, Buffer.from("]")]));
        const prot = new Thrift.TJSONProtocol(transport);
        prot.readMessageBegin();
        const location = new ServiceLocation();
        location.read(prot);
        prot.readMessageEnd();

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
            const conn = Thrift.createConnection(location.host, location.port, options)
                .on("error", err => reject(err))
                .on("connect", async () => {
                    const client = Thrift.createClient<T>(serviceType, conn);
                    resolve(new ThriftClient(conn, client));
                }).on("close", () => console.log("Connection closed for", location.port));
        });
    }
}

export namespace ThriftServiceManager {
    /**
     * Readies a service registry/manager and waits for it to finish starting before returning.
     * @param workbenchPath Path to the top-level folder of the workbench to use
     */
    export async function fromWorkbench(workbenchPath: string): Promise<ThriftServiceManager> {
        let registryPath = path.join(workbenchPath, "common/bin/CSpyServer2.exe"); // TODO: cross-platform-ify
        const tmpDir = getTmpDir(workbenchPath);
        const serviceRegistryProcess = spawn(registryPath, ["-standalone", "-sockets"],
                                                { cwd: tmpDir });
        serviceRegistryProcess.stdout?.on("data", dat => {
            console.log(dat.toString());
        });
        serviceRegistryProcess.stderr?.on("data", dat => {
            console.log("ERR: " + dat.toString());
        });
        serviceRegistryProcess.on("exit", code => {
            console.log("CSpyServer exited: " + code);
        });

        try {
            await waitUntilReady(serviceRegistryProcess);
            return new ThriftServiceManager(path.join(tmpDir, "CSpyServer2-ServiceRegistry.txt"));
        } catch(e) {
            serviceRegistryProcess.kill();
            throw e;
        }
    }

    // reads stdout as a hacky way to wait until cspyserver has launched
    // TODO: find a more robust way to detect when cspyserver is ready
    function waitUntilReady(process: ChildProcess): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let output: string = "";
            const onData = (data: Buffer | string) => {
                output += data;
                if (output.includes("running")) {
                    console.log("CSpyServer has launched.");
                    process.stdout?.removeListener("data", onData);
                    resolve();
                }
            }
            process.stdout?.on("data", onData);

            setTimeout(() => reject("Service registry launch timed out"), 10000);
        });
    }

    // Creates and returns a temporary directory unique to the currently opened folder & workbench.
    // This is used to store the bootstrap files created by CSpyServer2, to avoid conflicts if
    // several cspy processes are run at the same time.
    function getTmpDir(workbenchPath: string): string {
        let openedFolder = "cspy";
        const hashed = createHash("md5").update(openedFolder + workbenchPath).digest("hex");
        const tmpPath = path.join(tmpdir(), "iar-vsc-" + hashed);
        if (!fs.existsSync(tmpPath)) {
            fs.mkdirSync(tmpPath);
        }
        return tmpPath;
    }

}