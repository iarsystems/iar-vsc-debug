import { BreakpointDescriptor } from "./breakpointDescriptor";
import { DescriptorReader } from "./descriptorReader";

/**
 * A descriptor carrying enablement state, category id, and a ULE
 */
export class LocOnlyDescriptor extends BreakpointDescriptor {
    public ule: string;

    /**
     * Constructs from a serialized descriptor
     */
    constructor(reader: DescriptorReader) {
        super(reader);
        this.ule = reader.readString();
    }
}