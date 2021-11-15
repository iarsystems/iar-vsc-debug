import { DescriptorReader } from "./descriptorReader";

/**
 * Describes a generic breakpoint descriptor from C-SPY, of any type.
 * Right now only supports deserializing, there is no need (yet) for us to serialize these.
 */
export class BreakpointDescriptor {
    public enabled: boolean;
    public categoryId: string;

    /**
     * Constructs from a serialized descriptor
     */
    constructor(reader: DescriptorReader) {
        this.enabled = reader.readBoolean();
        this.categoryId = reader.readString();
    }
}