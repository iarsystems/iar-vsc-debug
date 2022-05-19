/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocEtcDescriptor } from "./locEtcDescriptor";

/**
 * Represents the types of emul breakpoints (auto, hardware and software).
 */
export enum EmulCodeBreakpointType {
    // These numbers have to match those used by the backend
    kDriverDefaultBreakpoint = 0,
    kDriverHardwareBreakpoint = 1,
    kDriverSoftwareBreakpoint = 2
}
export namespace EmulCodeBreakpointType {
    export function fromNumber(num: number) {
        switch (num) {
        case EmulCodeBreakpointType.kDriverDefaultBreakpoint:
            return 0;
        case EmulCodeBreakpointType.kDriverHardwareBreakpoint:
            return 1;
        case EmulCodeBreakpointType.kDriverSoftwareBreakpoint:
            return 2;
        default:
            throw new Error(num + " is not a valid breakpoint type");
        }
    }

    export function toNumber(type: EmulCodeBreakpointType): number {
        return type;
    }
}

/**
 * Breakpoint descriptor for EMUL_CODE breakpoints, used e.g. by i-jet and j-link.
 * The same as STD_CODE2, but adds an additional type property.
 */
export class EmulCodeBreakpointDescriptor extends LocEtcDescriptor {
    public type: EmulCodeBreakpointType;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, type: EmulCodeBreakpointType])
     *  Creates a new descriptor from scratch using the given category id and ule. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, EmulCodeBreakpointType]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.type = EmulCodeBreakpointType.fromNumber(reader.readInteger());
        } else {
            const [categoryId, ule, type] = arg;
            super([categoryId, ule]);
            this.type = type;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(EmulCodeBreakpointType.toNumber(this.type));
    }
}