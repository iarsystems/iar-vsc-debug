/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";
import { fireEvent, queries } from "@testing-library/dom";

suite("Listwindow drag & drop", () => {
    // We have no way of getting the 'dataTransfer' from a dragged cell, so for
    // now we only test external drops

    test("Handles external drop on cells", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        await TestUtils.render(api, renderParams);

        const cell = renderParams.rows[0]!.cells[0]!;
        const cellElem = queries.getByText(
            dom.window.document.documentElement,
            cell.text,
        );

        const msgPromise = api.waitForMessage("externalDrop");
        const dropText = "Hello drop";
        fireEvent.drop(cellElem, {
            dataTransfer: {
                getData: (type: string) =>
                    type === "text/plain" ? dropText : "",
            },
        });
        const msg = await msgPromise;
        Assert.strictEqual(msg.col, 0);
        Assert.strictEqual(msg.row, 0);
        Assert.strictEqual(msg.droppedText, dropText);
    });

    test("Handles external drop outside cells", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        await TestUtils.render(api, renderParams);

        const gridElem = dom.window.document.querySelector("#app")!.childNodes[0]!;

        const msgPromise = api.waitForMessage("externalDrop");
        const dropText = "Hello drop";
        fireEvent.drop(gridElem, {
            dataTransfer: {
                getData: (type: string) =>
                    type === "text/plain" ? dropText : "",
            },
        });
        const msg = await msgPromise;
        Assert.strictEqual(msg.col, -1);
        Assert.strictEqual(msg.row, -1);
        Assert.strictEqual(msg.droppedText, dropText);
    });
});
