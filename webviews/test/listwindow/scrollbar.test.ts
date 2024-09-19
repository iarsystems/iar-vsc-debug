/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";

suite("Scrollbar", () => {
    // We have no way of getting the 'dataTransfer' from a dragged cell, so for
    // now we only test external drops

    test("Is hidden when entire content fits in window", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        await TestUtils.render(api, renderParams);

        const scrollbar: HTMLElement | null = dom.window.document.querySelector(
            "listwindow-scrollbar",
        );
        if (scrollbar) {
            Assert.strictEqual(scrollbar.style.display, "none");
        }
    });

    test("Is shown when content does not fit in window", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        renderParams.scrollInfo.fractionBefore = 0.5;
        renderParams.scrollInfo.fractionInWin = 0.5;
        await TestUtils.render(api, renderParams);

        const scrollbar: HTMLElement | null = dom.window.document.querySelector(
            "listwindow-scrollbar",
        );
        Assert(scrollbar);
        Assert.notStrictEqual(scrollbar.style.display, "none");
    });

    test("Sends events on click", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        renderParams.scrollInfo.fractionBefore = 0.5;
        renderParams.scrollInfo.fractionInWin = 0.5;
        await TestUtils.render(api, renderParams);

        const scrollbar: HTMLElement | null = dom.window.document.querySelector(
            "listwindow-scrollbar",
        );
        Assert(scrollbar);
        Assert.notStrictEqual(scrollbar.style.display, "none");

        user.click(scrollbar);
        await api.waitForMessage("absoluteScrolled");
    });
});
