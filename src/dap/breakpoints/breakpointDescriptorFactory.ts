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

/**
 * Creates code breakpoint descriptors. Does not registers them in the cspy backend.
 */
export abstract class CodeBreakpointDescriptorFactory {
    /**
     * Creates a new code breakpoint descriptor pointing to the given ule
     */
    abstract createOnUle(ule: string): LocOnlyDescriptor;
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

export class EmulCodeBreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {
    /**
     * Creates a new descriptor factory
     * @param type The breakpoint type to write for created breakpoint descriptors (signaling e.g. HW/SW breakpoints). This number must be recognized by the driver.
     */
    constructor(private readonly type: number) {
        super();
    }

    override createOnUle(ule: string): LocEtcDescriptor {
        return new EmulCodeBreakpointDescriptor([BreakpointCategory.EMUL_CODE, ule, this.type]);
    }
}

export class StdCode2BreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {

    override createOnUle(ule: string): LocEtcDescriptor {
        return new LocEtcDescriptor([BreakpointCategory.STD_CODE2, ule]);
    }
}

export class HwCodeBreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {

    override createOnUle(ule: string): LocOnlyDescriptor {
        return new LocOnlyDescriptor([BreakpointCategory.HW_CODE, ule]);
    }
}

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