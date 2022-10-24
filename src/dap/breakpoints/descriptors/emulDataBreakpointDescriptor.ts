/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AccessType } from "./accessType";
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocOnlyDescriptor } from "./locOnlyDescriptor";

/**
 * Breakpoint descriptor for EMUL_DATA breakpoints, used e.g. by i-jet and j-link.
 */
export class EmulDataBreakpointDescriptor extends LocOnlyDescriptor {
    /**
     * The access type to break on (e.g. read/write/readWrite)
     */
    private readonly access: AccessType;
    private readonly useExtendedRange: boolean;
    private readonly useMatchData: boolean;
    private readonly dataValue: number;
    private readonly dataMask: number;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, type: AccessType])
     *  Creates a new descriptor from scratch using the given category id, ule and access type. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, AccessType]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.access = reader.readInteger();
            this.useExtendedRange = reader.readBoolean();
            this.useMatchData = reader.readBoolean();
            this.dataValue = reader.readInteger();
            this.dataMask = reader.readInteger();
        } else {
            const [categoryId, ule, accessType] = arg;
            super([categoryId, ule]);
            this.access = accessType;
            this.useExtendedRange = false;
            this.useMatchData = false;
            this.dataValue = 0;
            this.dataMask = 0;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(this.access);
        writer.writeBool(this.useExtendedRange);
        writer.writeBool(this.useMatchData);
        writer.writeInteger(this.dataValue);
        writer.writeInteger(this.dataMask);
    }
}