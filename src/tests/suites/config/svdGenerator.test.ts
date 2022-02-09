import * as Assert from "assert";
import * as Path from "path";
import * as Fs from "fs";
import { CSpyLaunchRequestArguments } from "../../../dap/cspyDebug";
import { SvdGenerator } from "../../../svdGenerator";
import { TestUtils } from "../testUtils";
import { JSDOM } from "jsdom";

// NOTE: These tests should be run with a release-flavored EW, otherwise they can take a lot of time
suite("SVD generator tests", () => {
    let stm32Config: CSpyLaunchRequestArguments;
    let stm32Svd: string;

    suiteSetup(() => {
        const installDirs = TestUtils.getEwPaths();
        Assert(installDirs, "No workbenches found to use for testing");
        // For now just use the first entry, and assume it points directly to a top-level ew directory
        const workbench = installDirs[0];

        const config = TestUtils.doSetup(workbench);

        stm32Svd = Path.join(workbench, "arm/CONFIG/debugger/ST/STM32F401.svd"),
        stm32Config = {
            ...config,
            driver: "sim2",
            driverOptions: [
                "--endian=little",
                "--cpu=Cortex-M4",
                "--fpu=VFPv4_SP",
                "-p",
                Path.join(workbench, "arm/CONFIG/debugger/ST/STM32F401CB.ddf"),
                "--semihosting",
                "--device=STM32F401CB",
                "--multicore_nr_of_cores=1"
            ],
        };
    });

    const assertCspyMatchesSvdFile = function(cspyData: SvdGenerator.SvdDevice, svdFile: string) {
        Assert.strictEqual(cspyData.addressUnitBits, 8);
        const document = new JSDOM(Fs.readFileSync(svdFile)).window.document;
        const peripherals = document.getElementsByTagName("peripheral");
        const peripheralNames: string[] = [];
        for (let i = 0; i < peripherals.length; i++) {
            const svdPeripheral = peripherals.item(i)!;
            if (svdPeripheral.getAttribute("derivedFrom") !== null) {
                continue;
            }
            const name = svdPeripheral.getElementsByTagName("name").item(0)!.textContent!;
            const cspyPeripheral = cspyData.peripherals.peripheral.find(periph => periph.name === name);
            Assert(cspyPeripheral !== undefined, `Could not find a peripheral with name '${name}'`);
            const baseAddress = BigInt(svdPeripheral.getElementsByTagName("baseAddress").item(0)!.textContent!);

            const registers = svdPeripheral.getElementsByTagName("register");
            for (let j = 0; j < registers.length; j++) {
                const svdRegister = registers.item(j)!;
                const name = svdRegister.getElementsByTagName("name").item(0)!.textContent!;
                const cspyRegister: SvdGenerator.SvdRegister | undefined  = cspyPeripheral.registers.register.find(reg => reg.displayName === name);
                Assert(cspyRegister !== undefined, `Could not find register named '${name}' in peripheral '${cspyPeripheral.name}'`);
                const size = svdRegister.getElementsByTagName("size").item(0)!.textContent!;
                Assert.strictEqual(BigInt(size), BigInt(cspyRegister.size), `The register size did not match for '${name}'`);
                const addressOffset = svdRegister.getElementsByTagName("addressOffset").item(0)!.textContent!;
                const address = baseAddress + BigInt(addressOffset);
                Assert.strictEqual(address, BigInt(cspyRegister.addressOffset) + BigInt(cspyPeripheral.baseAddress), `The address did not match for register '${name}'`);

                const fields: HTMLCollection = svdRegister.getElementsByTagName("field");
                for (let k = 0; k < fields.length; k++) {
                    const svdField = fields.item(k)!;
                    const name = svdField.getElementsByTagName("name").item(0)!.textContent!;
                    if (name === "Reserved") {
                        continue;
                    }
                    const cspyField = cspyRegister.fields.field.find(field => field.name === name);
                    Assert(cspyField !== undefined, `Could not find field named '${name}' in register '${cspyRegister.name}'`);
                    // The bit ranges are a little difficult to test, since c-spy sometimes narrows them down from the svd.
                    // The best we can do, I think, is to check that the cspy range is not larger than the one in the svd.
                    if (svdField.getElementsByTagName("bitOffset").length > 0) {
                        const bitOffset = svdField.getElementsByTagName("bitOffset").item(0)!.textContent!;
                        Assert(BigInt(cspyField.lsb) === BigInt(bitOffset), `Range mismatch for field '${name}'`);
                        const bitWidth = svdField.getElementsByTagName("bitWidth").item(0)!.textContent!;
                        Assert(BigInt(cspyField.msb) - BigInt(cspyField.lsb) + BigInt(1) === BigInt(bitWidth), `Range mismatch for field '${name}'`);
                    } else {
                        const range = svdField.getElementsByTagName("bitRange").item(0)!.textContent!;
                        const match = range.match(/\[(\d+):(\d+)\]/)!;
                        const msb = match[1]!;
                        const lsb = match[2]!;
                        Assert(BigInt(cspyField.lsb) >= BigInt(lsb), `Range mismatch for field '${name}'`);
                        Assert(BigInt(cspyField.msb) <= BigInt(msb), `Range mismatch for field '${name}'`);
                    }
                }
                Assert.strictEqual(cspyRegister.fields.field.length, fields.length, `Number of fields did not match for register '${name}'`);
            }
            Assert.strictEqual(cspyPeripheral.registers.register.length, registers.length, `Number of registers did not match for peripheral '${name}'`);
        }
        Assert(cspyData.peripherals.peripheral.length >= peripheralNames.length);
    };

    test("STM32F401CB", async() => {
        const cspyData = await SvdGenerator.generateSvd(stm32Config);
        assertCspyMatchesSvdFile(cspyData, stm32Svd);
    });
});