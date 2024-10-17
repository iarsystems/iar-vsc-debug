/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import { queries } from "@testing-library/dom";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";

suite("Listwindow tooltips", () => {
    test("Shows and hides tooltips", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        await TestUtils.render(api, renderParams);

        const cell = renderParams.rows[0]!.cells[0]!;
        const cellElem = queries.getByText(
            dom.window.document.documentElement,
            cell.text,
        );

        user.hover(cellElem);
        const msg = await api.waitForMessage("getTooltip", 2000);
        Assert.strictEqual(msg.col, 0);
        Assert.strictEqual(msg.row.value, "0");
        const tooltipText = "hello tooltip";
        api.postMessage({
            subject: "tooltipReply",
            text: tooltipText,
        });

        const tooltip = await queries.findByText(
            dom.window.document.documentElement,
            tooltipText,
        );

        await user.unhover(cellElem);
        Assert.strictEqual(tooltip.isConnected, false);
    });
});
