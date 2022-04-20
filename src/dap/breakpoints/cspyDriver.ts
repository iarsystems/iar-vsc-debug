import { IarOsUtils } from "iar-vsc-common/osUtils";
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

// Simulator for riscv/rh850
class SimDriver extends SimulatorDriver { }
// Emulator for rh850
class OcdDriver extends SimulatorDriver { }
// Simulator for arm
class Sim2Driver extends SimulatorDriver { }
// 64-bit simulator for arm
class ImperasDriver extends SimulatorDriver { }

// Common properties for all hardware drivers
abstract class HardwareDriver implements CSpyDriver {
    getCodeBreakpointDescriptorFactory(): CodeBreakpointDescriptorFactory {
        return new EmulCodeBreakpointDescriptorFactory();
    }
    isSimulator(): boolean {
        return false;
    }
}

class IJetDriver extends HardwareDriver { }
class JLinkDriver extends HardwareDriver { }
class GdbServerDriver extends HardwareDriver { }
class CADIDriver extends HardwareDriver { }
class StellarisDriver extends HardwareDriver { }
class PEMicroDriver extends HardwareDriver { }
class STLinkDriver extends HardwareDriver { }
class XDSDriver extends HardwareDriver { }
class TIMSPFETDriver extends HardwareDriver { }
// Used for unrecognized drivers.
class UnknownDriver extends HardwareDriver { }

export namespace CSpyDriver {
    /**
     * Tries to deduce the driver from the name of a driver library file (e.g. armSIM2.dll)
     */
    export function fromDriverName(driverName: string, targetName?: string) {
        let basename = Path.basename(driverName, IarOsUtils.libraryExtension());
        basename = basename.toLowerCase();

        if (basename.startsWith(IarOsUtils.libraryPrefix().toLowerCase())) {
            basename = basename.substring(IarOsUtils.libraryPrefix().length);
        }
        if (targetName && basename.startsWith(targetName.toLowerCase())) {
            basename = basename.substring(targetName.length);
        }

        const driverMap: Array<{ name: string, driver: () => CSpyDriver }> = [
            { name: "sim", driver: () => new SimDriver() },
            { name: "ocd", driver: () => new OcdDriver() },
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