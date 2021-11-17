import { BreakpointCategory } from "./breakpointCategory";
import { DescriptorReader } from "./descriptors/descriptorReader";
import { EmulCodeBreakpointDescriptor, EmulCodeBreakpointType } from "./descriptors/emulCodeBreakpointDescriptor";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";

/**
 * Creates code breakpoint descriptors. Does not registers them in the cspy backend.
 * This class only handles the portions of breakpoint creation that are driver-specific.
 */
export abstract class CodeBreakpointDescriptorFactory {
    /**
     * Creates a new code breakpoint descriptor pointing to the given ule
     */
    abstract createOnUle(ule: string): LocEtcDescriptor;

    /**
     * Parses a string descriptor (e.g. returned from cspy) into a descriptor object.
     * For now we use the same implementation for all code bp categories.
     */
    createFromString(descriptorStr: string): LocEtcDescriptor {
        const reader = new DescriptorReader(descriptorStr);
        return new LocEtcDescriptor(reader);
    }

}

export class EmulCodeBreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {
    type = EmulCodeBreakpointType.kDriverDefaultBreakpoint;

    override createOnUle(ule: string): LocEtcDescriptor {
        return new EmulCodeBreakpointDescriptor([BreakpointCategory.EMUL_CODE, ule, this.type]);
    }
}

export class StdCode2BreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {

    override createOnUle(ule: string): LocEtcDescriptor {
        return new LocEtcDescriptor([BreakpointCategory.STD_CODE2, ule]);
    }
}