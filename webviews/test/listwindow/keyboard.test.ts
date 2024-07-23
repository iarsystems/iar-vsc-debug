/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";
import { KeyNavOperation, ScrollOperation } from "iar-vsc-common/thrift/bindings/listwindow_types";

suite("Listwindow keyboard input", () => {
    test("Handles navigation keys", async() => {
        const { api, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        await TestUtils.render(api, renderParams);

        const keysAndOperations: Array<[string, KeyNavOperation]> = [
            ["ArrowUp", KeyNavOperation.kPrevItem],
            ["ArrowDown", KeyNavOperation.kNextItem],
            ["ArrowLeft", KeyNavOperation.kPrevLeft],
            ["ArrowRight", KeyNavOperation.kNextRight],
            ["Home", KeyNavOperation.kTopItem],
            ["End", KeyNavOperation.kBottomItem],
            ["PageUp", KeyNavOperation.kPrevItemPage],
            ["PageDown", KeyNavOperation.kNextItemPage],
        ];
        for (const [key, expectedOp] of keysAndOperations) {
            user.keyboard(`{${key}}`);
            const msg = await api.waitForMessage("keyNavigationPressed");
            Assert.strictEqual(msg.operation, expectedOp);
        }
    });

    test("Handles key scrolling", async() => {
        const { api, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        await TestUtils.render(api, renderParams);

        const keysAndOperations: Array<[string, ScrollOperation]> = [
            ["ArrowUp", ScrollOperation.kScrollLineUp],
            ["ArrowDown", ScrollOperation.kScrollLineDown],
            ["Home", ScrollOperation.kScrollTop],
            ["End", ScrollOperation.kScrollBottom],
            ["PageUp", ScrollOperation.kScrollPageUp],
            ["PageDown", ScrollOperation.kScrollPageDown],
        ];
        for (const [key, expectedOp] of keysAndOperations) {
            const msgPromise = api.waitForMessage("scrollOperationPressed");
            await user.keyboard(`{Control>}{${key}}{/Control}`);
            const msg = await msgPromise;
            Assert.strictEqual(msg.operation, expectedOp);
        }
    });
});
