import { IarOsUtils } from "../../utils/osUtils";
import * as Path from "path";
import { CodeBreakpointDescriptorFactory, EmulCodeBreakpointDescriptorFactory, StdCode2BreakpointDescriptorFactory } from "./breakpointDescriptorFactory";
import { logger } from "@vscode/debugadapter/lib/logger";

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
}

// Common properties for all simulator drivers.
abstract class SimulatorDriver implements CSpyDriver {
    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory {
        return new StdCode2BreakpointDescriptorFactory();
    }
    isSimulator() {
        return true;
    }
}

export class Sim2Driver extends SimulatorDriver { }
export class ImperasDriver extends SimulatorDriver { }

// Common properties for all hardware drivers
abstract class HardwareDriver implements CSpyDriver {
    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory {
        return new EmulCodeBreakpointDescriptorFactory();
    }
    isSimulator(): boolean {
        return false;
    }
}

export class IJetDriver extends HardwareDriver { }
export class JLinkDriver extends HardwareDriver { }
export class GdbServerDriver extends HardwareDriver { }
export class CADIDriver extends HardwareDriver { }
export class StellarisDriver extends HardwareDriver { }
export class PEMicroDriver extends HardwareDriver { }
export class STLinkDriver extends HardwareDriver { }
export class XDSDriver extends HardwareDriver { }
export class TIMSPFETDriver extends HardwareDriver { }
// Used for unrecognized drivers.
export class UnknownDriver extends HardwareDriver { }

export namespace CSpyDriver {
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

        const driverMap: Array<{ name: string, driver: () => CSpyDriver }> = [
            { name: "sim2", driver: () => new Sim2Driver() },
            { name: "imperas", driver: () => new ImperasDriver() },
            { name: "jet", driver: () => new IJetDriver() },
            { name: "jlink", driver: () => new JLinkDriver() },
            { name: "gdbserv", driver: () => new GdbServerDriver() },
            { name: "cadi", driver: () => new CADIDriver() },
            { name: "lmiftdi", driver: () => new StellarisDriver() },
            { name: "pemicro", driver: () => new PEMicroDriver() },
            { name: "stlink", driver: () => new STLinkDriver() },
            { name: "xds", driver: () => new XDSDriver() },
            { name: "tifet", driver: () => new TIMSPFETDriver() }
        ];
        const result = driverMap.find(({ name, }) => {
            return basename.endsWith(name.toLowerCase());
        });
        if (!result) {
            logger.error("Unable to recognize driver: " + driverName);
            // For unknown drivers, we just guess at some properties and hope it works.
            return new UnknownDriver();
        }
        return result.driver();
    }
}