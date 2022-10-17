/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { AccessType } from "./accessType";
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocEtcDescriptor } from "./locEtcDescriptor";

/**
 * Breakpoint descriptor for data breakpoints (e.g. STD_DATA2).
 */
export class DataLocEtcDescriptor extends LocEtcDescriptor {
    /**
     * The access type to break on (e.g. read/write/readWrite)
     */
    private readonly access: AccessType;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, access: AccessType])
     *  Creates a new descriptor from scratch using the given category id, ule and access type. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, AccessType]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.access = reader.readInteger();
        } else {
            const [categoryId, ule, access] = arg;
            super([categoryId, ule]);
            this.access = access;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(this.access);
    }
}