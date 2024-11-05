/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorReader } from "./descriptorReader";
import { DescriptorWriter } from "./descriptorWriter";
import { LocOnlyDescriptor } from "./locOnlyDescriptor";

/**
 * A descriptor for EMU_TIMER_<START|STOP> used by rh850 emulators
 */
export class EmuTimerBreakpointDescriptor extends LocOnlyDescriptor {
    private readonly timerNo: number;
    private readonly typeStart: boolean;

    /**
     * Typescript doesn't support multiple constructors, so we have to fuse them together like this.
     * constructor(reader: DescriptorReader)
     *  Constructs a new descriptor by deserializing from the given reader.
     * constructor([categoryId: string, ule: string, timerNo: number])
     *  Creates a new descriptor from scratch using the given category id and ule. Other attributes
     *  will be given their default values.
     */
    constructor(arg: DescriptorReader | [string, string, number]) {
        if (arg instanceof DescriptorReader) {
            const reader = arg;
            super(reader);
            this.timerNo = reader.readInteger();
            this.typeStart = reader.readBoolean();
        } else {
            const [categoryId, ule, timerNo] = arg;
            super([categoryId, ule]);
            this.timerNo = timerNo;
            this.typeStart = false;
        }
    }

    override serialize(writer: DescriptorWriter) {
        super.serialize(writer);
        writer.writeInteger(this.timerNo);
        writer.writeBool(this.typeStart);
    }
}