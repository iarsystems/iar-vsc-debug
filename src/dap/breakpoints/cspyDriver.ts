import { IarOsUtils } from "../../utils/osUtils";
import { BreakpointCategory } from "./breakpointCategory";
import * as Path from "path";

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
    // TODO: add e.g. stlink, xds
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
     * Gets the category to use for code breakpoints for the given driver
     */
    export function getCodeBreakpointCategory(driver: CSpyDriver) {
        switch (driver) {
        case CSpyDriver.SIM2:
        case CSpyDriver.IMPERAS:
            return BreakpointCategory.STD_CODE2;
        case CSpyDriver.IJET:
        case CSpyDriver.JLINK:
        case CSpyDriver.GDBSERVER:
        case CSpyDriver.CADI:
        case CSpyDriver.STELLARIS:
            return BreakpointCategory.EMUL_CODE;
        default:
            console.error("Tried getting code breakpoint category for unknown driver: " + driver);
            console.error("Assuming " + BreakpointCategory.EMUL_CODE);
            return BreakpointCategory.EMUL_CODE;
        }
    }
}