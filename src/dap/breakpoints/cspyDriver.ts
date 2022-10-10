/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { CodeBreakpointDescriptorFactory, EmulCodeBreakpointDescriptorFactory, StdCode2BreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { logger } from "@vscode/debugadapter/lib/logger";
import { BreakpointType } from "./cspyBreakpointManager";

/**
 * Provides some driver-specific information.
 */
export interface CSpyDriver {
    /**
     * Provides a breakpoint factory for each code breakpoint type supported by the driver.
     * If a driver supports more than one type, the user is able to select from them using e.g. console commands.
     */
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;

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

    constructor(public readonly libraryBaseNames: string[]) {
        this.codeBreakpointFactories = new Map([[BreakpointType.AUTO, new StdCode2BreakpointDescriptorFactory()]]);
    }

    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory {
        return new StdCode2BreakpointDescriptorFactory();
    }
    isSimulator() {
        return true;
    }
}

// Common properties for most hardware drivers
class GenericHardwareDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;

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
// Emulator for rh850. Doesn't support 'auto' breakpoints.
class Rh850OcdDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;

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
class Rl78OcdDriver implements CSpyDriver {
    readonly codeBreakpointFactories: ReadonlyMap<BreakpointType, CodeBreakpointDescriptorFactory>;

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
        E1 = "Renesas E1",
        E2 = "Renesas E2",
        E20 = "Renesas E20",
    }
    const driverMap: Array<{ name: string, target?: string, driver: CSpyDriver }> = [
        { name: DriverNames.SIMULATOR, driver: new SimulatorDriver(["sim", "sim2"]) },
        { name: DriverNames.IMPERAS, driver: new SimulatorDriver(["imperas"]) },
        { name: DriverNames.IJET, driver: new GenericHardwareDriver(["ijet", "jet"]) },
        { name: DriverNames.JLINK, driver: new GenericHardwareDriver(["jlink", "jlink2"]) },
        { name: DriverNames.GDBSERV, driver: new GenericHardwareDriver(["gdbserv"]) },
        { name: DriverNames.CADI, driver: new GenericHardwareDriver(["cadi"]) },
        { name: DriverNames.STELLARIS, driver: new GenericHardwareDriver(["lmiftdi"]) },
        { name: DriverNames.PEMICRO, driver: new GenericHardwareDriver(["pemicro"]) },
        { name: DriverNames.STLINK, driver: new GenericHardwareDriver(["stlink", "stlink2"]) },
        { name: DriverNames.XDS, driver: new GenericHardwareDriver(["xds", "xds2"]) },
        { name: DriverNames.TIFET, driver: new GenericHardwareDriver(["tifet"]) },
        { name: DriverNames.E1,  target: "rh850", driver: new Rh850OcdDriver(["ocd"]) },
        { name: DriverNames.E2,  target: "rh850", driver: new Rh850OcdDriver(["ocd"]) },
        { name: DriverNames.E20, target: "rh850", driver: new Rh850OcdDriver(["ocd"]) },
        { name: DriverNames.E1,  target: "rl78", driver: new Rl78OcdDriver(["ocd"]) },
        { name: DriverNames.E2,  target: "rl78", driver: new Rl78OcdDriver(["ocd"]) },
        { name: DriverNames.E20, target: "rl78", driver: new Rl78OcdDriver(["ocd"]) },
    ];
    /**
     * Returns a driver from a driver display name (e.g. a name returned from {@link nameFromDriverFile}).
     * Some driver names are shared by several targets, but the actual drivers behave differently, so the target
     * is needed to select the correct driver.
     */
    export function driverFromName(driverName: string, targetId: string): CSpyDriver {
        const result = driverMap.find(({ name, target }) => name === driverName && (target === undefined || target === targetId) );
        if (!result) {
            logger.error("Unable to recognize driver: " + driverName);
            // For unknown drivers, we just guess at some properties and hope it works.
            return new GenericHardwareDriver([driverName]);
        }
        return result.driver;
    }

    /**
     * Gets a display name for a driver, given its library file (e.g. libarmsim2.so)
     */
    export function nameFromDriverFile(driverFile: string, targetName?: string): string {
        let basename = driverFile.replace(new RegExp(`^lib|.so|.dll`, "ig"), "").toLowerCase();

        if (targetName && basename.startsWith(targetName.toLowerCase())) {
            basename = basename.substring(targetName.length);
        }
        return driverMap.find(({ driver }) => {
            return driver.libraryBaseNames.some(base => basename.endsWith(base));
        })?.name ?? basename;
    }
}