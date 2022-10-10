/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BreakpointCategory } from "./breakpointCategory";
import { EmulCodeBreakpointDescriptor } from "./descriptors/emulCodeBreakpointDescriptor";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";
import { LocOnlyDescriptor } from "./descriptors/locOnlyDescriptor";

/**
 * Creates code breakpoint descriptors. Does not registers them in the cspy backend.
 * This class only handles the portions of breakpoint creation that are driver-specific.
 */
export abstract class CodeBreakpointDescriptorFactory {
    /**
     * Creates a new code breakpoint descriptor pointing to the given ule
     */
    abstract createOnUle(ule: string): LocOnlyDescriptor;

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