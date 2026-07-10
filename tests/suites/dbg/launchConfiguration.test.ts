/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import { TestUtils } from "../testUtils";
import { CSpyServerLauncher } from "../../../src/dap/thrift/cspyServerLauncher";
import { DEBUGGER_SERVICE } from "iar-vsc-common/thrift/bindings/cspy_types";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import { TestConfiguration } from "../testConfiguration";
import { WorkbenchFeatures } from "iar-vsc-common/workbenchfeatureregistry";
import { Workbench } from "iar-vsc-common/workbench";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceRegistryProcess } from "iar-vsc-common/thrift/thriftServiceRegistryProcess";
import { PartialCSpyLaunchRequestArguments } from "../../../src/dap/cspyDebug";
import { CSpyException } from "iar-vsc-common/thrift/bindings/shared_types";

suite("Launch configuration tests", () =>{

    let serviceRegistry: ThriftServiceRegistryProcess;
    let cspyDebugger: ThriftClient<Debugger.Client>;
    let workbenchPath: string;

    type LaunchJson = PartialCSpyLaunchRequestArguments & {
        request: string,
        name: string,
        type: string
    }

    suiteSetup(async function() {
        const ewPath = TestUtils.getEwPath();
        Assert.ok(ewPath !== undefined);
        workbenchPath = ewPath;
        const workbench = Workbench.create(workbenchPath);
        Assert.ok(workbench !== undefined);
        const hasArmTarget = TestConfiguration.getConfiguration().debugConfiguration.target === "arm";
        const supportsLaunchConfiguration = WorkbenchFeatures.supportsFeature(workbench, WorkbenchFeatures.LaunchConfiguration, "arm");

        if (!hasArmTarget || !supportsLaunchConfiguration) {
            this.skip();
        }

        serviceRegistry = await CSpyServerLauncher.fromWorkbench(workbenchPath, 1);
        cspyDebugger = await serviceRegistry.serviceRegistry.findService(DEBUGGER_SERVICE, Debugger);
    });

    suiteTeardown(async() => {
        await serviceRegistry?.dispose();
    });

    test("resolve launch configuration from json (driver options)", async() => {
        const json: LaunchJson = {
            program: "a.out",
            target: "arm",
            driver: "Simulator",
            workbenchPath: workbenchPath,
            driverOptions: [],
            name: "vscode",
            type: "cspy",
            request: "launch"
        };

        try {
            const config = await cspyDebugger.service.resolveLaunchConfiguration(JSON.stringify(json));
            Assert.strictEqual(config.program, "a.out");
            Assert.ok(config.plugins[0] !== undefined);
            Assert.ok(config.plugins[0].toLowerCase().includes("libsupport"));
            Assert.ok(config.driverLib.includes("armsim2"));
            Assert.ok(config.processor.includes("armproc"));
        } catch (error) {
            Assert.ok(error instanceof CSpyException);
            Assert.fail(error);
        }

    });

    test("resolve launch configuration from json (device)", async() => {
        const json: LaunchJson = {
            program: "a.out",
            target: "arm",
            driver: "Simulator",
            workbenchPath: workbenchPath,
            device: "Zynq 7020",
            name: "vscode",
            type: "cspy",
            request: "launch"
        };

        try {
            const config = await cspyDebugger.service.resolveLaunchConfiguration(JSON.stringify(json));
            Assert.strictEqual(config.program, "a.out");
            Assert.ok(config.plugins[0] !== undefined);
            Assert.ok(config.plugins[0].toLowerCase().includes("libsupport"));
            Assert.ok(config.driverLib.includes("armsim2"));
            Assert.ok(config.processor.includes("armproc"));
        } catch (error) {
            Assert.ok(error instanceof CSpyException);
            Assert.fail(error);
        }

    });

    test("resolve invalid launch configuration from json (invalid driver)", async() => {
        const json: LaunchJson = {
            program: "a.out",
            target: "arm",
            driver: "foobar",
            workbenchPath: workbenchPath,
            driverOptions: [],
            name: "vscode",
            type: "cspy",
            request: "launch",
        };
        try {
            await cspyDebugger.service.resolveLaunchConfiguration(JSON.stringify(json));
            Assert.fail("Resolved an invalid json file");
        } catch (error) {
            Assert.ok(error instanceof CSpyException);
            Assert.ok(error.message.includes("foobar"));
        }

    });
});
