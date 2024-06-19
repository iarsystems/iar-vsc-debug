/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DescriptorConstants } from "./descriptorReader";


/**
 * Based on the eclipse DescriptorReader class.
 * Serializes breakpoint attributes into a string.
 */
export class DescriptorWriter {
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

        // The percent sign is used as escape
        str = str.replace(/%/g, "%%");

        // Double quotes and other special characters
        str = str.replace(/\cG/g, "%a");// "\a", bell
        str = str.replace(/[\b]/g, "%b");
        str = str.replace(/\f/g, "%f");
        str = str.replace(/\n/g, "%n");
        str = str.replace(/\r/g, "%r");
        str = str.replace(/\t/g, "%t");
        str = str.replace(/\v/g, "%v");// "\v", vertical tab
        str = str.replace(/"/g, "%\"");

        // A percent at the end produces an extra space. This is to avoid
        // "escaping" the closing quote of the string as a special char.
        if (str.charAt(str.length - 1) === "%")
            str += " ";

        this.output += DescriptorConstants.SEPARATOR_CHAR;
        this.output += DescriptorConstants.STRING_DELIMITER;
        this.output += str;
        this.output += DescriptorConstants.STRING_DELIMITER;
    }

    get result() {
        return this.output;
    }
}