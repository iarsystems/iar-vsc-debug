/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";

/**
 * Describes a generic breakpoint descriptor from C-SPY, of any type.
 * Right now only supports deserializing, there is no need (yet) for us to serialize these.
 */
export class BreakpointDescriptor {
    public enabled = true;
    public categoryId: string;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor(categoryId: string)
     *  Creates a new descriptor from scratch using the given category. It is enabled by default.
     */
    constructor(arg: DescriptorReader | string) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            this.enabled = reader.readBoolean();
            this.categoryId = reader.readString();
        } else {
            this.categoryId = arg;
        }
    }

    /**
     * Gets this descriptor in string form.
     * Deriving classes must override this method and write their own properties to the writer
     * (*after* calling super.serialize).
     */
    serialize(writer: DescriptorWriter) {
        writer.writeBool(this.enabled);
        writer.writeString(this.categoryId);
    }
}