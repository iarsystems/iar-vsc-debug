import * as vscode from "vscode";
import * as Assert from "assert";
import * as Path from "path";
import * as Fs from "fs";
import { CSpyLaunchRequestArguments } from "../../../src/dap/cspyDebug";
import { TestUtils } from "../testUtils";
import { JSDOM } from "jsdom";
import { CustomRequest, RegistersResponse } from "../../../src/dap/customRequest";
import { tmpdir } from "os";
import { ADAPTER_PORT, debugAdapterSuite } from "./debugAdapterSuite";
import { TestConfiguration } from "../testConfiguration";

// NOTE: These tests should be run with a release-flavored EW, otherwise they can take a lot of time
debugAdapterSuite("SVD generator tests", function(dc, dbgConfig)  {
    if (TestConfiguration.getConfiguration().debugConfiguration.target !== "arm") {
        console.log("Skipping SVD generator tests -- we are not on arm");
        return;
    }
    let genericConfig: vscode.DebugConfiguration & CSpyLaunchRequestArguments;

    let stm32Config: vscode.DebugConfiguration & CSpyLaunchRequestArguments;
    let stm32Svd: string;

    suiteSetup(() => {
        // Find a workbench to build with
        const installDirs = TestUtils.getEwPaths();
        Assert(installDirs, "No workbenches found to use for debugging");
        // For now just use the first entry, and assume it points directly to a top-level ew directory
        const workbench = installDirs[0];

        genericConfig = {
            type: "cspy",
            name: "SVD test",
            request: "launch",
            target: "arm",
            program: dbgConfig().program,
            workbenchPath: dbgConfig().workbenchPath,
            driver: "sim2",
            driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting"],
        };

        stm32Svd = Path.join(workbench, "arm/config/debugger/ST/STM32F401.svd"),
        stm32Config = {
            ...genericConfig,
            driver: "sim2",
            driverOptions: [
                "--endian=little",
                "--cpu=Cortex-M4",
                "--fpu=VFPv4_SP",
                "-p",
                Path.join(dbgConfig().workbenchPath, "arm/config/debugger/ST/STM32F401CB.ddf"),
                "--semihosting",
                "--device=STM32F401CB",
                "--multicore_nr_of_cores=1"
            ],
        };
        console.log(stm32Config);
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
                const cspyAddress: BigInt = BigInt(cspyPeripheral.getElementsByTagName("baseAddress").item(0)!.textContent!) + BigInt(cspyRegister.getElementsByTagName("addressOffset").item(0)!.textContent!);
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

    test("Returns undefined SVD for unspecificed device", () => {
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(genericConfig),
            dc().waitForEvent("initialized").then(async() => {
                const cspyData: RegistersResponse = (await dc().customRequest(CustomRequest.REGISTERS)).body;
                Assert.strictEqual(cspyData.svdContent, undefined);
            }),
        ]);
    });

    test("STM32F401CB", async() => {
        // delete cached register data
        await Fs.promises.rm(Path.join(tmpdir(), "iar-vsc-registercache"), { recursive: true, force: true });

        let svdContent: string;
        await Promise.all([
            dc().configurationSequence(),
            dc().launch(stm32Config),
            dc().waitForEvent("initialized").then(async() => {
                const cspyData: RegistersResponse = (await dc().customRequest(CustomRequest.REGISTERS)).body;
                Assert(cspyData.svdContent);
                svdContent = cspyData.svdContent;
                assertCspyMatchesSvdFile(new JSDOM(cspyData.svdContent).window.document, stm32Svd);

                // This should fetch from in-memory cache
                const cspyData2: RegistersResponse = (await dc().customRequest(CustomRequest.REGISTERS)).body;
                Assert.deepStrictEqual(cspyData, cspyData2);
            }),
        ]);

        // Restart the session and test that it works now that we have it cached
        await dc().stop();
        // Need to wait a bit for the adapter to be ready again
        await TestUtils.wait(1000);
        // dc = new DebugClient("node", "", "cspy");
        dc().on("output", ev => {
            console.log("CONSOLE OUT: " + ev.body.output.trim());
        });
        await dc().start(ADAPTER_PORT);

        await Promise.all([
            dc().configurationSequence(),
            dc().launch(stm32Config),
            dc().waitForEvent("initialized").then(async() => {
                const cachedRegistersData: RegistersResponse = (await dc().customRequest(CustomRequest.REGISTERS)).body;
                Assert(cachedRegistersData.svdContent);
                Assert.strictEqual(svdContent, cachedRegistersData.svdContent);
            }),
        ]);
    });

    test("Returns SVD for configured device", () => {
        const dbgConfigCopy = JSON.parse(JSON.stringify(dbgConfig()));
        dbgConfigCopy.stopOnEntry = false;
        return Promise.all([
            dc().configurationSequence(),
            dc().launch(dbgConfigCopy),
            dc().waitForEvent("initialized").then(async() => {
                const svdResponse: RegistersResponse = (await dc().customRequest(CustomRequest.REGISTERS)).body;
                if (TestConfiguration.getConfiguration().expectPeriphals) {
                    Assert(svdResponse.svdContent !== undefined);
                    Assert(svdResponse.svdContent.length > 0);
                } else {
                    Assert(svdResponse.svdContent === undefined);
                }
            }),
        ]);
    });

});