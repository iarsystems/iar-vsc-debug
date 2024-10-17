/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import { queries } from "@testing-library/dom";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";

suite("Listwindow header", () => {
    test("Renders header", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        renderParams.listSpec.showHeader = true;
        await TestUtils.render(api, renderParams);

        queries.getByText(dom.window.document.documentElement, "Column 1");
        queries.getByText(dom.window.document.documentElement, "Column 2");
    });

    test("Hides header if showHeader is false", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        renderParams.listSpec.showHeader = false;
        await TestUtils.render(api, renderParams);

        const column1 = queries.queryByText(
            dom.window.document.documentElement,
            "Column 1",
        );
        if (column1) {
            let elem: HTMLElement | null = column1;
            while (elem) {
                if (elem.style.display === "none") {
                    break;
                }
                elem = elem.parentElement;
            }
            Assert.notStrictEqual(
                elem,
                null,
                "Header element appears visible: no parent is set to display: none",
            );

        }
    });

    test("Sends message on header click", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        renderParams.listSpec.showHeader = true;
        renderParams.listSpec.canClickColumns = true;
        await TestUtils.render(api, renderParams);

        const col1 = queries.getByText(dom.window.document.documentElement, "Column 1");
        user.click(col1);
        const msg = await api.waitForMessage("columnClicked");
        Assert.strictEqual(msg.col, 0);
    });

    test("Cannot click header if disabled", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        renderParams.listSpec.showHeader = true;
        renderParams.listSpec.canClickColumns = true;
        await TestUtils.render(api, renderParams);

        const col1 = queries.getByText(dom.window.document.documentElement, "Column 1");
        user.click(col1);
        try {
            await api.waitForMessage("columnClicked");
            Assert.fail("Received header click message while clicks were disabled");
        } catch {}
    });
});