/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocOnlyDescriptor } from "./locOnlyDescriptor";

/**
* Supported access types for trace breakpoints.
* Replicates the values found in TdTraceStartBreakpoint::FromDescriptor()
*/
export enum EmulTraceBreakpointAccessType {
    ReadWrite = 0,
    Read,
    Write,
    Fetch,
    Cycles
}

/**
 * Breakpoint descriptor for all EMUL_TRACE breakpoints.
 */
export class EmulTraceBreakpointDescriptor extends LocOnlyDescriptor {
    private readonly access: EmulTraceBreakpointAccessType;
    private readonly useExtendedRange: boolean;
    private readonly useMatchData: boolean;
    private readonly dataValue: number;
    private readonly dataMask: number;
    private readonly rangeSize: number;
    private readonly linkWithNegate: boolean;
    private readonly linkWithAND: boolean;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, type: EmulTraceBreakpointAccessType])
     *  Creates a new descriptor from scratch using the given category id, ule and access type. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, EmulTraceBreakpointAccessType]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.access = reader.readInteger();
            this.useExtendedRange = reader.readBoolean();
            this.useMatchData = reader.readBoolean();
            this.dataValue = reader.readInteger();
            this.dataMask = reader.readInteger();
            this.rangeSize = reader.readInteger();
            this.linkWithNegate = reader.readBoolean();
            this.linkWithAND = reader.readBoolean();
        } else {
            const [categoryId, ule, accessType] = arg;
            super([categoryId, ule]);
            this.access = accessType;
            this.useExtendedRange = false;
            this.useMatchData = false;
            this.dataValue = 0;
            this.dataMask = 0xFFFFFFFF;
            // this does not seem to be used, but it is set to this value, see ECL-1214
            this.rangeSize = 0xcccccccc;
            this.linkWithNegate = false;
            this.linkWithAND = false;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(this.access);
        writer.writeBool(this.useExtendedRange);
        writer.writeBool(this.useMatchData);
        writer.writeInteger(this.dataValue);
        writer.writeInteger(this.dataMask);
        writer.writeInteger(this.rangeSize);
        writer.writeBool(this.linkWithNegate);
        writer.writeBool(this.linkWithAND);
    }
}