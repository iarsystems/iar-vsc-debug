/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { CodeBreakpointDescriptorFactory, DataBreakpointDescriptorFactory, EmulCodeBreakpointDescriptorFactory, EmulDataBreakpointDescriptorFactory, HwCodeBreakpointDescriptorFactory, LogBreakpointDescriptorFactory, StdCode2BreakpointDescriptorFactory, StdData2BreakpointDescriptorFactory, StdLog2BreakpointDescriptorFactory, EmuHwCodeBreakpointDescriptorFactory, EmuSwCodeBreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { logger } from "@vscode/debugadapter/lib/logger";
import { BreakpointType } from "./cspyBreakpointService";

/**
 * Provides some driver-specific information.
 */
export interface CSpyDriver {
    /**
     * Provides a breakpoint factory for each code breakpoint type supported by the driver.
     * If a driver supports more than one type, the user is able to select from them using e.g. console commands.
     */
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory?: DataBreakpointDescriptorFactory;
    readonly logBreakpointFactory: LogBreakpointDescriptorFactory;

    /**
     * Returns whether this driver is a simulator. This means e.g. that flash loading is not necessary.
     */
    isSimulator(): boolean;

    /**
     * The base names of the shared library file(s) to search for when loading the driver.
     * This should be without any prefixes (e.g. 'lib' or 'arm') or extensions (e.g. '.so' or '.dll').
     * If multiple names are specified, they are tested in the order given until a matching file is found.
     */
    readonly libraryBaseNames: string[];
}

// Common properties for most simulator drivers
class SimulatorDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory = new StdData2BreakpointDescriptorFactory();
    readonly logBreakpointFactory = new StdLog2BreakpointDescriptorFactory();

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([[BreakpointType.AUTO, new StdCode2BreakpointDescriptorFactory()]]);
    }

    isSimulator() {
        return true;
    }
}

// Common properties for most hardware drivers
class GenericHardwareDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory?: DataBreakpointDescriptorFactory = new EmulDataBreakpointDescriptorFactory();
    readonly logBreakpointFactory = new StdLog2BreakpointDescriptorFactory();

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([
            [BreakpointType.AUTO, new EmulCodeBreakpointDescriptorFactory(0)],
            [BreakpointType.HARDWARE, new EmulCodeBreakpointDescriptorFactory(1)],
            [BreakpointType.SOFTWARE, new EmulCodeBreakpointDescriptorFactory(2)],
        ]);
    }

    isSimulator(): boolean {
        return false;
    }
}
// Arm CADI driver, doesn't support data breakpoints
class CadiDriver extends GenericHardwareDriver {
    override readonly dataBreakpointFactory = undefined;
}
// Emulator for rh850. Doesn't support 'auto' breakpoints.
class Rh850EmuDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory = new StdData2BreakpointDescriptorFactory();
    readonly logBreakpointFactory = new StdLog2BreakpointDescriptorFactory();

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([
            [BreakpointType.SOFTWARE, new EmulCodeBreakpointDescriptorFactory(0)],
            [BreakpointType.HARDWARE, new EmulCodeBreakpointDescriptorFactory(1)],
        ]);
    }

    isSimulator(): boolean {
        return false;
    }
}
// Emulator for rl78.
class Rl78EmuDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory = undefined;
    readonly logBreakpointFactory = new StdLog2BreakpointDescriptorFactory();

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([
            [BreakpointType.SOFTWARE, new StdCode2BreakpointDescriptorFactory()],
            [BreakpointType.HARDWARE, new HwCodeBreakpointDescriptorFactory()],
        ]);
    }

    isSimulator(): boolean {
        return false;
    }
}
// atmel ice, avr one!, dragon, jtagice mkII, jtagice3, power debugger,
class AvrEmuDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory = new StdData2BreakpointDescriptorFactory();
    readonly logBreakpointFactory = new StdLog2BreakpointDescriptorFactory();

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([[BreakpointType.AUTO, new StdCode2BreakpointDescriptorFactory()]]);
    }

    isSimulator(): boolean {
        return false;
    }
}

class RxEmuDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;
    readonly dataBreakpointFactory = new StdData2BreakpointDescriptorFactory();
    readonly logBreakpointFactory = new StdLog2BreakpointDescriptorFactory();

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([
            [BreakpointType.AUTO, new StdCode2BreakpointDescriptorFactory()],
            [BreakpointType.HARDWARE, new EmuHwCodeBreakpointDescriptorFactory()],
            [BreakpointType.SOFTWARE, new EmuSwCodeBreakpointDescriptorFactory()],
        ]);
    }

    isSimulator(): boolean {
        return false;
    }
}

export namespace CSpyDriver {
    /**
     * Driver display names.
     * ! make sure these names match the "driver" enum in package.json
     */
    export enum DriverNames {
        SIMULATOR = "Simulator",
        IMPERAS = "64-bit Simulator",
        IJET = "I-jet",
        JLINK = "J-Link/J-Trace",
        GDBSERV = "GDB Server",
        CADI = "CADI",
        STELLARIS = "TI Stellaris",
        PEMICRO = "PE micro",
        STLINK = "ST-LINK",
        XDS = "TI XDS",
        TIFET = "TI MSP-FET",
        ARME2 = "Renesas E2 / E2 Lite for Arm",
        E1 = "Renesas E1",
        E2 = "Renesas E2",
        E20 = "Renesas E20",
        E2LITE = "Renesas E2 Lite / E2 On-board",
        EZCUBE = "EZ-CUBE",
        EZCUBE2 = "EZ-CUBE2",
        IECUBE = "IECUBE",
        TK = "TK",
        ATMELICE = "Atmel-ICE",
        AVRONE = "AVR ONE!",
        JTAGEICE3 = "JTAGICE3",
        JTAGICEMK2 = "JTAGICE mkII",
        DRAGON = "Dragon",
        POWERDEBUGGER = "Power Debugger"
    }

    /**
     * Maps driver display names to {@link CSpyDriver} instances, and driver file names ("base names") to driver display
     * names. Optionally, an entry may specify a target and/or driver argument, meaning that the mapping entry is only
     * valid for that target and when that driver argument is present.
     *
     * This mapping should be injective both ways, e.g.:
     * * Each driver name should only appear once
     * * If a driver base name appears more than once (e.g. ocd), each instance should be qualified with a target and/or driver option to differentiate it from other instances
     */
    const driverMap: Array<{ name: string, driver: CSpyDriver, target?: string, driverArgument?: string }> = [
        { name: DriverNames.SIMULATOR,     driver: new SimulatorDriver(["sim", "sim2"]) },
        { name: DriverNames.IMPERAS,       driver: new SimulatorDriver(["imperas"]) },
        { name: DriverNames.IJET,          driver: new GenericHardwareDriver(["ijet", "jet"]) },
        { name: DriverNames.JLINK,         driver: new GenericHardwareDriver(["jlink", "jlink2"]) },
        { name: DriverNames.GDBSERV,       driver: new GenericHardwareDriver(["gdbserv"]) },
        { name: DriverNames.CADI,          driver: new CadiDriver(["cadi"]) },
        { name: DriverNames.STELLARIS,     driver: new GenericHardwareDriver(["lmiftdi"]) },
        { name: DriverNames.PEMICRO,       driver: new GenericHardwareDriver(["pemicro"]) },
        { name: DriverNames.STLINK,        driver: new GenericHardwareDriver(["stlink", "stlink2"]) },
        { name: DriverNames.XDS,           driver: new GenericHardwareDriver(["xds", "xds2"]) },
        { name: DriverNames.TIFET,         driver: new GenericHardwareDriver(["tifet"]) },
        { name: DriverNames.ARME2,         driver: new GenericHardwareDriver(["e2"]), target: "arm" },
        { name: DriverNames.E1,            driver: new Rh850EmuDriver(["ocd"]), target: "rh850", driverArgument: "e1" },
        { name: DriverNames.E2,            driver: new Rh850EmuDriver(["ocd"]), target: "rh850", driverArgument: "e2" },
        { name: DriverNames.E20,           driver: new Rh850EmuDriver(["ocd"]), target: "rh850", driverArgument: "e20" },
        { name: DriverNames.E1,            driver: new Rl78EmuDriver(["ocd"]), target: "rl78", driverArgument: "e1" },
        { name: DriverNames.E2,            driver: new Rl78EmuDriver(["ocd"]), target: "rl78", driverArgument: "e2" },
        { name: DriverNames.E20,           driver: new Rl78EmuDriver(["ocd"]), target: "rl78", driverArgument: "e20" },
        { name: DriverNames.E1,            driver: new RxEmuDriver(["e1e20"]), target: "rx" },
        { name: DriverNames.E20,           driver: new RxEmuDriver(["e1e20"]), target: "rx" },
        { name: DriverNames.E2,            driver: new RxEmuDriver(["e2e2l"]), target: "rx", driverArgument: "e2" },
        { name: DriverNames.E2LITE,        driver: new RxEmuDriver(["e2e2l"]), target: "rx", driverArgument: "e2lite"},
        { name: DriverNames.EZCUBE2,       driver: new RxEmuDriver(["e2e2l"]), target: "rx", driverArgument: "e2lite"},
        { name: DriverNames.E2LITE,        driver: new Rl78EmuDriver(["ocd"]), driverArgument: "e2lite" },
        { name: DriverNames.EZCUBE,        driver: new Rl78EmuDriver(["ocd"]), driverArgument: "ezcube" },
        { name: DriverNames.EZCUBE2,       driver: new Rl78EmuDriver(["ocd"]), driverArgument: "ezcube2" },
        { name: DriverNames.TK,            driver: new Rl78EmuDriver(["ocd"]), driverArgument: "tk" },
        { name: DriverNames.IECUBE,        driver: new Rl78EmuDriver(["iecube"]) },
        { name: DriverNames.POWERDEBUGGER, driver: new AvrEmuDriver(["atmelice"]), driverArgument: "--drv_power_debugger"},
        { name: DriverNames.ATMELICE,      driver: new AvrEmuDriver(["atmelice"]) },
        { name: DriverNames.AVRONE,        driver: new AvrEmuDriver(["one"]) },
        { name: DriverNames.DRAGON,        driver: new AvrEmuDriver(["jtagice-mkii"]), driverArgument: "--drv_dragon" },
        { name: DriverNames.JTAGICEMK2,    driver: new AvrEmuDriver(["jtagice-mkii"]), },
        { name: DriverNames.JTAGEICE3,     driver: new AvrEmuDriver(["jtagice3"]), },
    ];
    /**
     * Returns a driver from a driver display name (e.g. a name returned from {@link getDriverName}).
     * Some driver names are shared by several targets, but the actual drivers behave differently, so the target
     * is needed to select the correct driver.
     */
    export function driverFromName(driverName: string, targetName: string, driverArgs: string[]): CSpyDriver {
        const result = driverMap.find(({ name, target, driverArgument }) => name === driverName &&
            (target === undefined || target === targetName) &&
            (driverArgument === undefined || driverArgs.includes(driverArgument)));
        if (!result) {
            logger.error("Unable to recognize driver: " + driverName);
            // For unknown drivers, we just guess at some properties and hope it works.
            return new GenericHardwareDriver([driverName]);
        }
        return result.driver;
    }

    /**
     * Gets a display name for a driver, given its library file (e.g. libarmsim2.so), target and driver arguments.
     * Some driver files have multiple user-facing names (e.g. E1/E2/E20) depending on the target and driver
     * arguments.
     */
    export function getDriverName(driverFile: string, targetName: string, driverArgs: string[]): string {
        let basename = driverFile.replace(new RegExp(`^lib|.so|.dll`, "ig"), "").toLowerCase();

        if (targetName && basename.startsWith(targetName.toLowerCase())) {
            basename = basename.substring(targetName.length);
        }
        return driverMap.find(({ driver, target, driverArgument }) => {
            return driver.libraryBaseNames.some(base => basename.endsWith(base)) &&
                (target === undefined || target === targetName) &&
                (driverArgument === undefined || driverArgs.includes(driverArgument));
        })?.name ?? basename;
    }
}