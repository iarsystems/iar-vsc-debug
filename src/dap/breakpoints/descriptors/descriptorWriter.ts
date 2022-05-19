/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorConstants } from "./descriptorReader";


/**
 * Based on the eclipse DescriptorReader class.
 * Serializes breakpoint attributes into a string.
 * MAY NOT WORK IN ALL CASES, I have cut some corners since right now this is only really used to write ULEs and categories
 */
export class DescriptorWriter {
    private static readonly ESCAPED_CHARS = [
        "%", "\x07", "\b", "\f", "\n", "\r", "\t", "\v", "\""
    ];

    private output = "";

    constructor() {
        this.output += DescriptorConstants.DESCRIPTOR_HEADER;
    }

    writeInteger(int: number) {
        this.output += DescriptorConstants.SEPARATOR_CHAR;
        this.output += int.toString();
    }

    writeBool(bool: boolean) {
        this.writeInteger(bool ? 1 : 0);
    }

    writeString(str: string) {
        if (DescriptorWriter.ESCAPED_CHARS.some(char => str.includes(char))) {
            throw new Error("The string has one or more characters requiring escaping, but the descriptor writer does not support this: " + str);
        }

        this.output += DescriptorConstants.SEPARATOR_CHAR;
        this.output += DescriptorConstants.STRING_DELIMITER;
        this.output += str;
        this.output += DescriptorConstants.STRING_DELIMITER;
    }

    get result() {
        return this.output;
    }
}