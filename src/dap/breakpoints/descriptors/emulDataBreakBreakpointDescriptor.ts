/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AccessType } from "./accessType";
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocOnlyDescriptor } from "./locOnlyDescriptor";

/**
 * Breakpoint descriptor for EMUL_DATA_BREAK breakpoints, used by RX drivers.
 */
export class EmulDataBreakBreakpointDescriptor extends LocOnlyDescriptor {
    private readonly adrCondition: number;
    private readonly adrMaskStr: string;
    private readonly adrMaskCompare: number;
    private readonly adrRange: number;
    private readonly adrEndLocStr: string;
    private readonly datAccess: number;
    private readonly datAccessSize: number;
    private readonly datDataStr: string;
    private readonly datMaskCheck: number;
    private readonly datMaskStr: string;
    private readonly datMaskCompare: number;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, accessType: AccessType])
     *  Creates a new descriptor from scratch using the given category id, ule and access type. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, AccessType]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.adrCondition = reader.readInteger();
            this.adrMaskStr = reader.readString();
            this.adrMaskCompare = reader.readInteger();
            this.adrRange = reader.readInteger();
            this.adrEndLocStr = reader.readString();
            this.datAccess = reader.readInteger();
            this.datAccessSize = reader.readInteger();
            this.datDataStr = reader.readString();
            this.datMaskCheck = reader.readInteger();
            this.datMaskStr = reader.readString();
            this.datMaskCompare = reader.readInteger();
        } else {
            const [categoryId, ule, accessType] = arg;
            super([categoryId, ule]);
            this.adrCondition = 0;
            this.adrMaskStr = "0x0";
            this.adrMaskCompare = 0;
            this.adrRange = 0;
            this.adrEndLocStr = "";
            this.datAccess = AccessTypeToInt(accessType);
            this.datAccessSize = 0;
            this.datDataStr = "";
            this.datMaskCheck = 0;
            this.datMaskStr = "";
            this.datMaskCompare = 0;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(this.adrCondition);
        writer.writeString(this.adrMaskStr);
        writer.writeInteger(this.adrMaskCompare);
        writer.writeInteger(this.adrRange);
        writer.writeString(this.adrEndLocStr);
        writer.writeInteger(this.datAccess);
        writer.writeInteger(this.datAccessSize);
        writer.writeString(this.datDataStr);
        writer.writeInteger(this.datMaskCheck);
        writer.writeString(this.datMaskStr);
        writer.writeInteger(this.datMaskCompare);
    }
}

// Matches the constants in RX's TdEmu.h
function AccessTypeToInt(type: AccessType) {
    switch (type) {
        case AccessType.ReadWrite:
            return 2;
        case AccessType.Write:
            return 1;
        case AccessType.Read:
        default:
            return 0;
    }
}