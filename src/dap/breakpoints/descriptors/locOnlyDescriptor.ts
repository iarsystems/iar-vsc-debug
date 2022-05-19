/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BreakpointDescriptor } from "./breakpointDescriptor";
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";

/**
 * A descriptor carrying enablement state, category id, and a ULE
 */
export class LocOnlyDescriptor extends BreakpointDescriptor {
    public ule: string;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string])
     *  Creates a new descriptor from scratch using the given category id and ule.
     */
    constructor(arg: DescriptorReader | [string, string]) {
        if (arg instanceof DescriptorReader) {
            super(arg);
            this.ule = arg.readString();
        } else {
            const [categoryId, ule] = arg;
            super(categoryId);
            this.ule = ule;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeString(this.ule);
    }
}