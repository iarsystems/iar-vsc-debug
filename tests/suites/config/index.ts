/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as path from "path";
import {getTestPromise} from "iar-vsc-common/testutils/testUtils";

export function run(): Promise<void> {
    return getTestPromise(path.resolve(__dirname), 20000);
}
