/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocOnlyDescriptor } from "./locOnlyDescriptor";

/**
 * Breakpoint descriptor for log breakpoints (e.g. STD_LOG2).
 */
export class LogDescriptor extends LocOnlyDescriptor {
    public readonly condition: string;
    private readonly triggerWhenTrue: boolean;
    private readonly message: string;
    private readonly msgIsArgList: boolean;
    private readonly threadSpecific: boolean;
    private readonly threadId: number;


    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, message: string])
     *  Creates a new descriptor from scratch using the given category id, ule and message. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, string]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.condition       = reader.readString();
            this.triggerWhenTrue = reader.readBoolean();
            this.message         = reader.readString();
            this.msgIsArgList    = reader.readBoolean();
            this.threadSpecific  = reader.readBoolean();
            this.threadId        = reader.readInteger();
        } else {
            const [categoryId, ule, message] = arg;
            super([categoryId, ule]);
            this.condition       = "";
            this.triggerWhenTrue = true,
            this.message         = message;
            this.msgIsArgList    = false;
            this.threadSpecific  = false;
            this.threadId        = 0;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeString(this.condition);
        writer.writeBool(this.triggerWhenTrue);
        writer.writeString(this.message);
        writer.writeBool(this.msgIsArgList);
        writer.writeBool(this.threadSpecific);
        writer.writeInteger(this.threadId);
    }
}