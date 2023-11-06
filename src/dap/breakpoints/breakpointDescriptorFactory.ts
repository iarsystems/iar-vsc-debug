/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AccessType } from "./descriptors/accessType";
import { BreakpointCategory } from "./breakpointCategory";
import { DataLocEtcDescriptor } from "./descriptors/dataLocEtcDescriptor";
import { EmulCodeBreakpointDescriptor } from "./descriptors/emulCodeBreakpointDescriptor";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";
import { LocOnlyDescriptor } from "./descriptors/locOnlyDescriptor";
import { EmulDataBreakpointDescriptor } from "./descriptors/emulDataBreakpointDescriptor";
import { LogDescriptor } from "./descriptors/logDescriptor";
import { EmulDataBreakBreakpointDescriptor } from "./descriptors/emulDataBreakBreakpointDescriptor";

/**
 * Creates code breakpoint descriptors. Does not registers them in the cspy backend.
 */
export interface CodeBreakpointDescriptorFactory {
    /**
     * Creates a new code breakpoint descriptor pointing to the given ule
     */
    createOnUle(ule: string): LocOnlyDescriptor;
}

/**
 * Creates data breakpoint descriptors. Does not registers them in the cspy backend.
 */
export abstract class DataBreakpointDescriptorFactory {
    /**
     * Creates a new data breakpoint descriptor pointing to the given ule.
     * The caller is responsible for verifying that the wanted access type is supported see {@link getSupportedAccessTypes}.
     */
    abstract createOnUle(ule: string, access: AccessType): LocOnlyDescriptor;

    /**
     * Gets all access types supported by this driver.
     */
    getSupportedAccessTypes(): AccessType[] {
        // All drivers seem to support all access types, so set this as the default. If we later add one that doesn't,
        // simply override this.
        return [AccessType.Read, AccessType.Write, AccessType.ReadWrite];
    }
}

export interface LogBreakpointDescriptorFactory {
    /**
     * Creates a new log breakpoint descriptor pointing to the given ule.
     */
    createOnUle(ule: string, message: string): LocOnlyDescriptor;
}


// ---- implementations below ----

// Code Breakpoints

export class EmulCodeBreakpointDescriptorFactory implements CodeBreakpointDescriptorFactory {
    /**
     * Creates a new descriptor factory
     * @param type The breakpoint type to write for created breakpoint descriptors (signaling e.g. HW/SW breakpoints). This number must be recognized by the driver.
     */
    constructor(private readonly type: number) {}

    createOnUle(ule: string): LocEtcDescriptor {
        return new EmulCodeBreakpointDescriptor([BreakpointCategory.EMUL_CODE, ule, this.type]);
    }
}

export class StdCode2BreakpointDescriptorFactory implements CodeBreakpointDescriptorFactory {

    createOnUle(ule: string): LocEtcDescriptor {
        return new LocEtcDescriptor([BreakpointCategory.STD_CODE2, ule]);
    }
}

export class HwCodeBreakpointDescriptorFactory implements CodeBreakpointDescriptorFactory {

    createOnUle(ule: string): LocOnlyDescriptor {
        return new LocOnlyDescriptor([BreakpointCategory.HW_CODE, ule]);
    }
}

export class EmuHwCodeBreakpointDescriptorFactory implements CodeBreakpointDescriptorFactory {

    createOnUle(ule: string): LocOnlyDescriptor {
        return new LocOnlyDescriptor([BreakpointCategory.EMUL_HW_CODE, ule]);
    }
}

export class EmuSwCodeBreakpointDescriptorFactory implements CodeBreakpointDescriptorFactory {

    createOnUle(ule: string): LocOnlyDescriptor {
        return new LocOnlyDescriptor([BreakpointCategory.EMUL_SW_CODE, ule]);
    }
}

// Data Breakpoints

export class StdData2BreakpointDescriptorFactory extends DataBreakpointDescriptorFactory {

    override createOnUle(ule: string, access: AccessType): LocOnlyDescriptor {
        return new DataLocEtcDescriptor([BreakpointCategory.STD_DATA2, ule, access]);
    }
}

export class EmulDataBreakpointDescriptorFactory extends DataBreakpointDescriptorFactory {

    override createOnUle(ule: string, access: AccessType): LocOnlyDescriptor {
        return new EmulDataBreakpointDescriptor([BreakpointCategory.EMUL_DATA, ule, access]);
    }
}

export class EmulDataBreakBreakpointDescriptorFactory extends DataBreakpointDescriptorFactory {

    override createOnUle(ule: string, access: AccessType): LocOnlyDescriptor {
        return new EmulDataBreakBreakpointDescriptor([BreakpointCategory.EMUL_DATA_BREAK, ule, access]);
    }
}

// Log Breakpoints

export class StdLog2BreakpointDescriptorFactory implements LogBreakpointDescriptorFactory {

    createOnUle(ule: string, message: string): LocOnlyDescriptor {
        return new LogDescriptor([BreakpointCategory.STD_LOG2, ule, message]);
    }

}