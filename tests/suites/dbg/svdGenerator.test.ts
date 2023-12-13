/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as Assert from "assert";
import * as Path from "path";
import * as Fs from "fs";
import { CSpyLaunchRequestArguments } from "../../../src/dap/cspyDebug";
import { TestUtils } from "../testUtils";
import { JSDOM } from "jsdom";
import { CustomRequest } from "../../../src/dap/customRequest";
import { tmpdir } from "os";
import { ADAPTER_PORT, debugAdapterSuite } from "./debugAdapterSuite";
import { TestConfiguration } from "../testConfiguration";
import { TestSandbox } from "iar-vsc-common/testutils/testSandbox";
import { DebugClient } from "@vscode/debugadapter-testsupport";
import { spawn } from "child_process";

// NOTE: These tests should be run with a release-flavored EW, otherwise they can take a lot of time
debugAdapterSuite("SVD generator tests", function(dc, dbgConfig)  {

    test("Returns SVD for configured device", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfig()),
            dc().waitForEvent("stopped").then(async() => {
                const svdResponse: CustomRequest.RegistersResponse = (await dc().customRequest(CustomRequest.Names.REGISTERS)).body;
                if (TestConfiguration.getConfiguration().registers.expectPeripherals) {
                    Assert(svdResponse.svdContent !== undefined);
                    Assert(svdResponse.svdContent.length > 0);
                } else {
                    Assert(svdResponse.svdContent === undefined);
                }
            }),
        ]);
    });

});

suite("Specific device SVD Tests", () => {
    setup(function() {
        console.log("\n==========================================================" + this.currentTest!.title + "==========================================================\n");
    });
    test("STM32F401CB", async function() {
        if (JSON.stringify(TestConfiguration.getConfiguration()) !== JSON.stringify(TestConfiguration.TEST_CONFIGURATIONS["armSim2"])
            || TestConfiguration.getConfiguration().smokeTestsOnly) {
            this.skip();
            return;
        }

        const targetProject = Path.join(__dirname, "../../../../tests/TestProjects/RegistersTest/stm32.ewp");
        const sandbox = new TestSandbox(TestUtils.PROJECT_ROOT);
        const projectDir = sandbox.copyToSandbox(Path.dirname(targetProject));
        const project = Path.join(projectDir, Path.basename(targetProject));
        const program = Path.join(Path.dirname(project), "Debug/Exe", Path.basename(project, ".ewp") + ".out");

        const workbench = TestUtils.getEwPath();
        Assert(workbench, "No workbench found to use for debugging");

        TestUtils.buildProject(workbench, project, "Debug");

        const svdFile = Path.join(workbench, "arm/config/debugger/ST/STM32F401.svd");
        const dbgConfig: CSpyLaunchRequestArguments = {
            driver: "Simulator",
            target: "arm",
            workbenchPath: workbench,
            stopOnSymbol: true,
            program,
            driverOptions: [
                "--endian=little",
                "--cpu=Cortex-M4",
                "--fpu=VFPv4_SP",
                "--device=STM32F401CB",
                "--semihosting",
                "--multicore_nr_of_cores=1",
                "-p",
                "$TOOLKIT_DIR$/config/debugger/ST/STM32F401CB.ddf",
            ],
        };


        // delete cached register data
        await Fs.promises.rm(Path.join(tmpdir(), "iar-vsc-registercache"), { recursive: true, force: true });

        // For some reason DebugClient isnt able to start the adapter itself, so start it manually as a tcp server
        const debugAdapter = spawn("node", [Path.join(__dirname, "../../../src/dap/debugAdapter.js"), `--server=${ADAPTER_PORT}`]);
        debugAdapter.stdout?.on("data", dat => {
            console.log("OUT: " + dat.toString().replace(/^\s+|\s+$/g, ""));
        });
        debugAdapter.stderr?.on("data", dat => {
            console.log("ERR: " + dat.toString().replace(/^\s+|\s+$/g, ""));
        });
        // Need to wait a bit for the adapter to start
        await TestUtils.wait(4000);
        const dc = new DebugClient("node", "", "cspy");
        dc.on("output", ev => {
            console.log("CONSOLE OUT: " + ev.body.output.replace(/^\s+|\s+$/g, ""));
        });
        await dc.start(ADAPTER_PORT);

        let svdContent: string;
        await Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.waitForEvent("initialized").then(async() => {
                const cspyData: CustomRequest.RegistersResponse = (await dc.customRequest(CustomRequest.Names.REGISTERS)).body;
                Assert(cspyData.svdContent);
                svdContent = cspyData.svdContent;
                assertCspyMatchesSvdFile(new JSDOM(cspyData.svdContent).window.document, svdFile);

                // This should fetch from in-memory cache
                const cspyData2: CustomRequest.RegistersResponse = (await dc.customRequest(CustomRequest.Names.REGISTERS)).body;
                Assert.deepStrictEqual(cspyData, cspyData2);
            }),
        ]);

        // Restart the session and test that it works now that we have it cached
        await dc.stop();
        // Need to wait a bit for the adapter to be ready again
        await TestUtils.wait(1000);
        await dc.start(ADAPTER_PORT);

        await Promise.all([
            dc.configurationSequence(),
            dc.launch(dbgConfig),
            dc.waitForEvent("stopped").then(async() => {
                const cachedRegistersData: CustomRequest.RegistersResponse = (await dc.customRequest(CustomRequest.Names.REGISTERS)).body;
                Assert(cachedRegistersData.svdContent);
                Assert.strictEqual(svdContent, cachedRegistersData.svdContent);
            }),
        ]);

        await dc.stop();
        await TestUtils.wait(1500);
        debugAdapter.kill();
    });

    function assertCspyMatchesSvdFile(cspySvd: Document, svdFile: string) {
        Assert.strictEqual(cspySvd.getElementsByTagName("addressUnitBits").item(0)!.textContent, "8");
        const document = new JSDOM(Fs.readFileSync(svdFile)).window.document;
        const peripherals = document.getElementsByTagName("peripheral");
        const peripheralNames: string[] = [];
        for (let i = 0; i < peripherals.length; i++) {
            const svdPeripheral = peripherals.item(i)!;
            if (svdPeripheral.getAttribute("derivedFrom") !== null) {
                continue;
            }
            const periphName = svdPeripheral.getElementsByTagName("name").item(0)!.textContent!;
            const cspyPeripheral = findInHTMLCollection(cspySvd.getElementsByTagName("peripheral"), per => per.getElementsByTagName("name").item(0)!.textContent === periphName);

            Assert(cspyPeripheral !== undefined, `Could not find a peripheral with name '${periphName}'`);
            const baseAddress = BigInt(svdPeripheral.getElementsByTagName("baseAddress").item(0)!.textContent!);

            const registers = svdPeripheral.getElementsByTagName("register");
            for (let j = 0; j < registers.length; j++) {
                const svdRegister = registers.item(j)!;
                const regName = svdRegister.getElementsByTagName("name").item(0)!.textContent!;
                const cspyRegister = findInHTMLCollection(cspyPeripheral.getElementsByTagName("register"), reg => reg.getElementsByTagName("displayName").item(0)!.textContent === regName);
                Assert(cspyRegister !== undefined, `Could not find register named '${regName}' in peripheral '${periphName}'`);
                const size = svdRegister.getElementsByTagName("size").item(0)!.textContent!;
                const cspySize = cspyRegister.getElementsByTagName("size").item(0)!.textContent!;
                Assert.strictEqual(BigInt(size), BigInt(cspySize), `The register size did not match for '${regName}'`);
                const addressOffset = svdRegister.getElementsByTagName("addressOffset").item(0)!.textContent!;
                const address = baseAddress + BigInt(addressOffset);
                const cspyAddress: bigint = BigInt(cspyPeripheral.getElementsByTagName("baseAddress").item(0)!.textContent!) + BigInt(cspyRegister.getElementsByTagName("addressOffset").item(0)!.textContent!);
                Assert.strictEqual(address, cspyAddress, `The address did not match for register '${regName}'`);

                const fields: HTMLCollection = svdRegister.getElementsByTagName("field");
                for (let k = 0; k < fields.length; k++) {
                    const svdField = fields.item(k)!;
                    const fieldName = svdField.getElementsByTagName("name").item(0)!.textContent!;
                    if (fieldName === "Reserved") {
                        continue;
                    }
                    const cspyField = findInHTMLCollection(cspyRegister.getElementsByTagName("field"), fld => fld.getElementsByTagName("name").item(0)!.textContent === fieldName);
                    Assert(cspyField !== undefined, `Could not find field named '${fieldName}' in register '${regName}'`);

                    const cspyLsb = cspyField.getElementsByTagName("lsb").item(0)!.textContent!;
                    const cspyMsb = cspyField.getElementsByTagName("msb").item(0)!.textContent!;
                    if (svdField.getElementsByTagName("bitOffset").length > 0) {
                        const bitOffset = svdField.getElementsByTagName("bitOffset").item(0)!.textContent!;
                        Assert(BigInt(cspyLsb) === BigInt(bitOffset), `Range mismatch for field '${fieldName}'`);
                        const bitWidth = svdField.getElementsByTagName("bitWidth").item(0)!.textContent!;
                        Assert(BigInt(cspyMsb) - BigInt(cspyLsb) + BigInt(1) === BigInt(bitWidth), `Range mismatch for field '${fieldName}'`);
                    } else {
                        const range = svdField.getElementsByTagName("bitRange").item(0)!.textContent!;
                        const match = range.match(/\[(\d+):(\d+)\]/)!;
                        const msb = match[1]!;
                        const lsb = match[2]!;
                        Assert(BigInt(cspyLsb) >= BigInt(lsb), `Range mismatch for field '${fieldName}'`);
                        Assert(BigInt(cspyMsb) <= BigInt(msb), `Range mismatch for field '${fieldName}'`);
                    }
                }
                Assert.strictEqual(cspyRegister.getElementsByTagName("field").length, fields.length, `Number of fields did not match for register '${regName}'`);
            }
            Assert.strictEqual(cspyPeripheral.getElementsByTagName("register").length, registers.length, `Number of registers did not match for peripheral '${periphName}'`);
        }
        Assert(cspySvd.getElementsByName("peripheral").length >= peripheralNames.length);
    }

    function findInHTMLCollection(collection: HTMLCollection, predicate: (elem: Element) => boolean) {
        for (let i = 0; i < collection.length; i++) {
            const item = collection.item(i);
            if (item && predicate(item)) {
                return item;
            }
        }
        return undefined;
    }
});