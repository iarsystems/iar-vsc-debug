/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { EmulDataBreakpointDescriptor } from "./emulDataBreakpointDescriptor";

export enum TdlEmulTraceBreakpointAccessType {
    ReadWrite = 0,
    Read,
    Write,
    Fetch,
}

/**
 * Breakpoint descriptor for TDL_EMUL_TRACE_<START|STOP>. These are identical
 * to EMUL_DATA, except that they allow a 'fetch' access type.
 */
export class TdlEmulTraceDescriptor extends EmulDataBreakpointDescriptor {

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, access: TdlEmulTraceBreakpointAccessType])
     *  Creates a new descriptor from scratch using the given category id, ule and access type. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, TdlEmulTraceBreakpointAccessType]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
        } else {
            const [categoryId, ule, access] = arg;
            super([categoryId, ule, access]);
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
    }
}