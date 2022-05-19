/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocOnlyDescriptor } from "./locOnlyDescriptor";

/**
 * A descriptor corresponding to DbuStandardBpDescriptors.cpp,
 * adding e.g. conditions and skip count.
 */
export class LocEtcDescriptor extends LocOnlyDescriptor {
    // Keeping these private until we actually support them
    private readonly isThreadSpecific: boolean;
    private readonly threadId: number;
    private readonly stopWhenTrue: boolean;
    private readonly condition: string;
    private readonly skipCount: number;
    private readonly action: string;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string])
     *  Creates a new descriptor from scratch using the given category id and ule. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.isThreadSpecific = reader.readBoolean();
            this.threadId = reader.readInteger();
            this.stopWhenTrue = reader.readBoolean();
            this.condition = reader.readString();
            this.skipCount = reader.readInteger();
            this.action = reader.readString();
        } else {
            super(arg);
            this.isThreadSpecific = false;
            this.threadId = 0;
            this.stopWhenTrue = true;
            this.condition = "";
            this.skipCount = 0;
            this.action = "";
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeBool(this.isThreadSpecific);
        writer.writeInteger(this.threadId);
        writer.writeBool(this.stopWhenTrue);
        writer.writeString(this.condition);
        writer.writeInteger(this.skipCount);
        writer.writeString(this.action);
    }
}