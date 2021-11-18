import { IarOsUtils } from "../../utils/osUtils";
import * as Path from "path";
import { EmulCodeBreakpointDescriptorFactory, StdCode2BreakpointDescriptorFactory } from "./breakpointDescriptorFactory";

/**
 * Lists all CSpy drivers. Their value should match the suffix used to name their library file
 */
export enum CSpyDriver {
    SIM2 = "SIM2",
    IMPERAS = "IMPERAS",
    IJET = "JET",
    JLINK = "JLINK",
    GDBSERVER = "GDBSERV",
    CADI = "CADI",
    STELLARIS = "LMIFTDI",
    PEMICRO = "PEMICRO",
    STLINK = "STLINK",
    XDS = "XDS",
    TIMSPFET = "TIFET",
}

export namespace CSpyDriverUtils {
    /**
     * Tries to deduce the driver from the name of a driver library file (e.g. armSIM2.dll)
     */
    export function fromDriverName(driverName: string, targetName?: string) {
        let basename = Path.basename(driverName, IarOsUtils.libraryExtension());
        basename = basename.toLowerCase();

        if (basename.startsWith(IarOsUtils.libraryPrefix().toLowerCase())) {
            basename = basename.substr(IarOsUtils.libraryPrefix().length);
        }
        if (targetName && basename.startsWith(targetName.toLowerCase())) {
            basename = basename.substr(targetName.length);
        }

        const result = Object.values(CSpyDriver).find(driver => {
            return basename.endsWith(driver.toLowerCase());
        });
        if (!result) {
            throw new Error("Unable to recognize driver: " + driverName);
        }
        return result;
    }

    /**
     * Gets a factory for creating code bp descriptors for the given driver.
     */
    export function getCodeBreakpointDescriptorFactory(driver: CSpyDriver) {
        switch (driver) {
        case CSpyDriver.SIM2:
        case CSpyDriver.IMPERAS:
            return new StdCode2BreakpointDescriptorFactory();
        case CSpyDriver.IJET:
        case CSpyDriver.JLINK:
        case CSpyDriver.GDBSERVER:
        case CSpyDriver.CADI:
        case CSpyDriver.STELLARIS:
        case CSpyDriver.PEMICRO:
        case CSpyDriver.STLINK:
        case CSpyDriver.XDS:
        case CSpyDriver.TIMSPFET:
            return new EmulCodeBreakpointDescriptorFactory();
        default:
            console.error("Tried getting code breakpoint category for unknown driver: " + driver);
            console.error("Assuming EMUL_CODE");
            return new EmulCodeBreakpointDescriptorFactory();
        }
    }
}