/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export namespace DescriptorConstants {
    /** Delimiter character used by string attributes */
    export const STRING_DELIMITER = "\"";

    /** Escape character used to represent special chars in string attributes */
    export const GUARD_CHAR = "%";

    /** Character used to separate different attributes in a descriptor */
    export const SEPARATOR_CHAR = " ";

    /** Character used as the first char in a descriptor */
    export const DESCRIPTOR_HEADER = "_";
}

/**
 * Based on the eclipse DescriptorReader class.
 * Parses attributes from a string breakpoint descriptor.
 */
export class DescriptorReader {
    constructor(private descriptor: string) {
        if (!descriptor.startsWith(DescriptorConstants.DESCRIPTOR_HEADER)) {
            throw new Error("No header found in descriptor: " + descriptor);
        }

        this.consume(DescriptorConstants.DESCRIPTOR_HEADER.length);
    }

    readString(): string {
        this.trimSeparator();

        const quote = this.peek(1);
        if (quote !== DescriptorConstants.STRING_DELIMITER) {
            throw new Error("The next available attribute in the descriptor is not a string");
        }
        this.consume(1);

        let result = "";

        let running = true;
        while (running) {
            const nextChar = this.consume(1);
            switch (nextChar) {
            case "":
                throw new Error("Incomplete descriptor found");
            case DescriptorConstants.GUARD_CHAR:
                {
                    const next = this.consume(1);
                    switch (next) {
                    case DescriptorConstants.STRING_DELIMITER: // double quotes
                        result += next;
                        break;
                    case DescriptorConstants.GUARD_CHAR: // '%'
                        result += nextChar;
                        break;
                    case "a":
                        // Bell
                        result += "\u0007";
                        break;
                    case "b":
                        // Backspace
                        result += "\b";
                        break;
                    case "f":
                        // Form feed
                        result += "\f";
                        break;
                    case "n":
                        // New line
                        result += "\n";
                        break;
                    case "v":
                        // Vertical TAB
                        result += "\u000b";
                        break;
                    case "t":
                        // TAB
                        result += "\t";
                        break;
                    case "r":
                        // New line
                        result += "\r";
                        break;

                    default:
                        // No guard, insert escape character in result
                        result += nextChar;
                        result += next;

                    } // switch(next) ends here

                }
                break; // case ESCAPE_CHAR ends here
            case DescriptorConstants.STRING_DELIMITER:
                if (result.endsWith("% "))
                    result = result.substring(0, result.length - 1);

                running = false;
                break;
            default:
                result += nextChar;
                break;
            }
        }
        return result;
    }

    readInteger(): number {
        this.trimSeparator();

        const data = this.consumeToNextSeparator();
        const result = Number.parseInt(data);
        if (isNaN(result)) {
            throw new Error("The parsed attribute is not an integer: " + data);
        }
        return result;
    }

    readBoolean(): boolean {
        const int = this.readInteger();
        return int !== 0;
    }

    private trimSeparator() {
        const match = this.descriptor.match(new RegExp(`^${DescriptorConstants.SEPARATOR_CHAR}+`));
        if (match && match[0]) {
            this.consume(match[0].length);
        }
    }

    private consume(charCount: number) {
        const result = this.peek(charCount);
        this.descriptor = this.descriptor.substring(charCount);
        return result;
    }

    private peek(charCount: number) {
        return this.descriptor.substring(0, charCount);
    }

    private consumeToNextSeparator() {
        const separatorPos = this.descriptor.indexOf(DescriptorConstants.SEPARATOR_CHAR);
        if (separatorPos === -1) {
            return this.consume(this.descriptor.length);
        }
        return this.consume(separatorPos + 1);
    }
}