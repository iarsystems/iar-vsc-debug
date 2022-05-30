/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { BreakpointCategory } from "./breakpointCategory";
import { BreakpointType } from "./cspyBreakpointManager";
import { DescriptorReader } from "./descriptors/descriptorReader";
import { EmulCodeBreakpointDescriptor } from "./descriptors/emulCodeBreakpointDescriptor";
import { LocEtcDescriptor } from "./descriptors/locEtcDescriptor";

/**
 * Creates code breakpoint descriptors. Does not registers them in the cspy backend.
 * This class only handles the portions of breakpoint creation that are driver-specific.
 */
export abstract class CodeBreakpointDescriptorFactory {
    /**
     * Creates a new code breakpoint descriptor pointing to the given ule
     */
    abstract createOnUle(ule: string): LocEtcDescriptor;

    /**
     * Parses a string descriptor (e.g. returned from cspy) into a descriptor object.
     * For now we use the same implementation for all code bp categories.
     */
    createFromString(descriptorStr: string): LocEtcDescriptor {
        const reader = new DescriptorReader(descriptorStr);
        return new LocEtcDescriptor(reader);
    }

}

export class EmulCodeBreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {
    private _type = BreakpointType.AUTO;

    /**
     * Creates a new descriptor factory
     * @param types Maps the {@link BreakpointType}s supported by this driver to their integer representation in the descriptor
     */
    constructor(private readonly types: Map<BreakpointType, number>) {
        super();
        if (types.size === 0) {
            throw new Error("Must support at least one breakpoint type");
        }
        this._type = types.keys().next().value;
    }

    override createOnUle(ule: string): LocEtcDescriptor {
        const typeInt = this.types.get(this._type);
        if (typeInt === undefined) {
            throw new Error("Could not translate breakpoint type. This should never happen!");
        }
        return new EmulCodeBreakpointDescriptor([BreakpointCategory.EMUL_CODE, ule, typeInt]);
    }

    get supportedTypes(): BreakpointType[] {
        return Array.from(this.types.keys());
    }

    get type(): BreakpointType {
        return this._type;
    }

    set type(value: BreakpointType) {
        if (!this.types.has(value)) {
            throw new Error("Trying to set unsupported breakpoint type: " + value);
        }
        this._type = value;
    }
}

export class StdCode2BreakpointDescriptorFactory extends CodeBreakpointDescriptorFactory {

    override createOnUle(ule: string): LocEtcDescriptor {
        return new LocEtcDescriptor([BreakpointCategory.STD_CODE2, ule]);
    }
}