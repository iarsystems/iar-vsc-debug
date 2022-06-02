/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { IarOsUtils } from "iar-vsc-common/osUtils";
import * as Path from "path";
import { CodeBreakpointDescriptorFactory, EmulCodeBreakpointDescriptorFactory, StdCode2BreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { logger } from "@vscode/debugadapter/lib/logger";
import { BreakpointType } from "./cspyBreakpointManager";

/**
 * Provides some driver-specific information.
 */
export interface CSpyDriver {
    /**
     * Gets a factory for creating code bp descriptors for this driver.
     */
    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory;

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

class SimulatorDriver implements CSpyDriver {
    constructor(public readonly libraryBaseNames: string[]) {}

    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory {
        return new StdCode2BreakpointDescriptorFactory();
    }
    isSimulator() {
        return true;
    }
}

abstract class HardwareDriver implements CSpyDriver {
    constructor(public readonly libraryBaseNames: string[], private readonly breakpointTypes: Map<BreakpointType, number>) {}

    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory {
        return new EmulCodeBreakpointDescriptorFactory(
            this.breakpointTypes
        );
    }
    isSimulator(): boolean {
        return false;
    }
}
// Common properties for most hardware drivers
class GenericHardwareDriver extends HardwareDriver {
    constructor(libraryBaseNames: string[]) {
        super(libraryBaseNames,
            new Map([[BreakpointType.AUTO, 0], [BreakpointType.HARDWARE, 1], [BreakpointType.SOFTWARE, 2]]));
    }
}
// Emulator for rh850
class OcdDriver extends HardwareDriver {
    constructor(libraryBaseNames: string[]) {
        super(libraryBaseNames,
            new Map([[BreakpointType.SOFTWARE, 0], [BreakpointType.HARDWARE, 1]])
        );
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
    const driverMap: Array<{ name: string, driver: CSpyDriver }> = [
        { name: DriverNames.SIMULATOR, driver: new SimulatorDriver(["sim2", "sim"]) },
        { name: DriverNames.IMPERAS, driver: new SimulatorDriver(["imperas"]) },
        { name: DriverNames.IJET, driver: new GenericHardwareDriver(["ijet", "jet"]) },
        { name: DriverNames.JLINK, driver: new GenericHardwareDriver(["jlink"]) },
        { name: DriverNames.GDBSERV, driver: new GenericHardwareDriver(["gdbserv"]) },
        { name: DriverNames.CADI, driver: new GenericHardwareDriver(["cadi"]) },
        { name: DriverNames.STELLARIS, driver: new GenericHardwareDriver(["lmiftdi"]) },
        { name: DriverNames.PEMICRO, driver: new GenericHardwareDriver(["pemicro"]) },
        { name: DriverNames.STLINK, driver: new GenericHardwareDriver(["stlink"]) },
        { name: DriverNames.XDS, driver: new GenericHardwareDriver(["xds"]) },
        { name: DriverNames.TIFET, driver: new GenericHardwareDriver(["tifet"]) },
        { name: DriverNames.E1, driver: new OcdDriver(["ocd"]) },
        { name: DriverNames.E2, driver: new OcdDriver(["ocd"]) },
        { name: DriverNames.E20, driver: new OcdDriver(["ocd"]) },
    ];
    /**
     * Returns a driver matching a driver display name (e.g. a name returned from {@link nameFromDriverFile}).
     */
    export function driverFromName(driverName: string): CSpyDriver {
        const result = driverMap.find(({ name, }) => name === driverName);
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
        let basename = Path.basename(driverFile, IarOsUtils.libraryExtension());
        basename = basename.toLowerCase();

        if (basename.startsWith(IarOsUtils.libraryPrefix().toLowerCase())) {
            basename = basename.substring(IarOsUtils.libraryPrefix().length);
        }
        if (targetName && basename.startsWith(targetName.toLowerCase())) {
            basename = basename.substring(targetName.length);
        }
        return driverMap.find(({ driver }) => {
            return driver.libraryBaseNames.some(base => basename.endsWith(base));
        })?.name ?? basename;
    }
}