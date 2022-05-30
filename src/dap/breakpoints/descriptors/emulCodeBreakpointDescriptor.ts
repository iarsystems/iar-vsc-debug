/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocEtcDescriptor } from "./locEtcDescriptor";

/**
 * Breakpoint descriptor for EMUL_CODE breakpoints, used e.g. by i-jet and j-link.
 * The same as STD_CODE2, but adds an additional type property.
 */
export class EmulCodeBreakpointDescriptor extends LocEtcDescriptor {
    /**
     * The type specifies e.g. if this is a hardware or software breakpoint.
     * The exact values used and their meanings is driver-dependent.
     */
    public type: number;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, type: EmulCodeBreakpointType])
     *  Creates a new descriptor from scratch using the given category id and ule. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, number]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.type = reader.readInteger();
        } else {
            const [categoryId, ule, type] = arg;
            super([categoryId, ule]);
            this.type = type;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(this.type);
    }
}