/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Assert from "assert";
import Int64 = require("node-int64");
import { fireEvent, queries } from "@testing-library/dom";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";
import { ViewMessage } from "../../listwindow/protocol";
import { SelRange } from "iar-vsc-common/thrift/bindings/listwindow_types";

suite("Listwindow cells", () => {
    test("Renders cells", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(3);
        await TestUtils.render(api, renderParams);

        for (const row of renderParams.rows) {
            for (const cell of row.cells) {
                queries.getByText(
                    dom.window.document.documentElement,
                    cell.text,
                );
            }
        }
    });

    test("Sends message on left click", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        renderParams.rows[0]!.cells[1]!.format.editable = false;
        await TestUtils.render(api, renderParams);

        const cell = queries.getByText(
            dom.window.document.documentElement,
            renderParams.rows[0]!.cells[1]!.text,
        );
        user.click(cell);

        const msg = await api.waitForMessage("cellLeftClicked");
        Assert.strictEqual(msg.row, 0);
        Assert.strictEqual(msg.col, 1);
    });

    test("Sends message on right click", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        await TestUtils.render(api, renderParams);

        const msgPromise = api.waitForMessage("getContextMenu");
        const cell = queries.getByText(
            dom.window.document.documentElement,
            renderParams.rows[0]!.cells[1]!.text,
        );
        fireEvent.contextMenu(cell);

        const msg = await msgPromise;
        Assert.strictEqual(msg.row, 0);
        Assert.strictEqual(msg.col, 1);
    });

    test("Can edit cells by clicking", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(1);
        renderParams.rows[0]!.cells[1]!.format.editable = true;
        await TestUtils.render(api, renderParams);

        const cell = queries.getByText(
            dom.window.document.documentElement,
            renderParams.rows[0]!.cells[1]!.text,
        );
        user.click(cell);

        const msg = await api.waitForMessage("getEditableString");
        Assert.strictEqual(msg.row, 0);
        Assert.strictEqual(msg.col, 1);
        const editString = "Hello, editstring";
        api.postMessage({
            ...msg,
            subject: "editableStringReply",
            info: {
                editString: editString,
                column: msg.col,
                range: {
                    first: new Int64(0),
                    last: new Int64(editString.length),
                },
            },
        });

        const input = await TestUtils.findBySelector(
            dom.window.document.documentElement,
            `vscode-text-field[current-value="${editString}"] input`,
        );
        user.type(input, "{Enter}");
        const editMsg = await api.waitForMessage("cellEdited");
        Assert.strictEqual(editMsg.row, 0);
        Assert.strictEqual(editMsg.col, 1);
    });

    test("Can edit cells by pressing 'insert'", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(2);
        renderParams.rows[1]!.cells[1]!.format.editable = true;
        renderParams.selection = [new SelRange({
            first: new Int64(1),
            last: new Int64(1),
        })];
        await TestUtils.render(api, renderParams);

        user.keyboard("{Insert}");
        const msg = await api.waitForMessage("getEditableString");
        Assert.strictEqual(msg.row, 1);
        Assert.strictEqual(msg.col, -1);
        const editString = "Hello, editstring";
        api.postMessage({
            row: msg.row,
            col: 1,
            subject: "editableStringReply",
            info: {
                editString: editString,
                column: 0,
                range: { first: new Int64(0), last: new Int64(-1) },
            },
        });


        await TestUtils.findBySelector(
            dom.window.document.documentElement,
            `vscode-text-field[current-value="${editString}"] input`,
        );
    });

    test("Renders treeinfo", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(5);
        renderParams.rows[0]!.treeinfo = "+";
        renderParams.rows[1]!.treeinfo = "-";
        renderParams.rows[2]!.treeinfo = "v.";
        renderParams.rows[3]!.treeinfo = "^.";

        await TestUtils.render(api, renderParams);

        for (let row = 0; row < 4; row++) {
            const cell = dom.window.document.querySelector(
                `[column="0"][row="${row}"]`,
            );
            Assert(cell);
            Assert(cell.querySelector("button"));
        }

        const cell = dom.window.document.querySelector(`[column="0"][row="4"]`);
        Assert(cell);
        Assert.strictEqual(cell.querySelector("button"), null);
    });

    test("Can click treeinfo", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(4);
        renderParams.rows[0]!.treeinfo = "+";
        renderParams.rows[1]!.treeinfo = "-";
        renderParams.rows[2]!.treeinfo = "v.";
        renderParams.rows[3]!.treeinfo = "^.";
        await TestUtils.render(api, renderParams);

        const expectedMessages: Array<ViewMessage> = [
            { subject: "rowExpansionToggled", row: 0 },
            { subject: "rowExpansionToggled", row: 1 },
            { subject: "moreLessToggled", row: 2 },
            { subject: "moreLessToggled", row: 3 },
        ];

        for (let row = 0; row < 4; row++) {
            const cell = dom.window.document.querySelector(
                `[column="0"][row="${row}"]`,
            );
            Assert(cell);
            const button = cell.querySelector("button");
            Assert(button);

            const cellClickMsgPromise = api.waitForMessage("cellLeftClicked", 100);
            user.click(button);
            const expectedMsg = expectedMessages[row]!;
            const msg = await api.waitForMessage(expectedMsg.subject);
            Assert.deepStrictEqual(JSON.stringify(msg), JSON.stringify(expectedMsg));
            try {
                // A tree info click should *not* also trigger a cell click
                await cellClickMsgPromise;
                Assert.fail(
                    "Cell registered click on tree info buttan as a cell click",
                );
            } catch {}
        }
    });

    test("Renders checkboxes", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(2);
        renderParams.listSpec.showCheckBoxes = true;
        renderParams.rows[0]!.isChecked = false;
        renderParams.rows[1]!.isChecked = true;

        await TestUtils.render(api, renderParams);

        for (let row = 0; row < 2; row++) {
            const cell = dom.window.document.querySelector(
                `[column="0"][row="${row}"]`,
            );
            Assert(cell);
            const checkbox = cell.querySelector("vscode-checkbox");
            Assert(checkbox);
            Assert("checked" in checkbox);
            Assert.strictEqual(checkbox.checked, renderParams.rows[row]?.isChecked);
        }
    });

    test("Can click checkbox", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters(2);
        renderParams.listSpec.showCheckBoxes = true;

        await TestUtils.render(api, renderParams);

        const cell = dom.window.document.querySelector(
            `[column="0"][row="1"]`,
        );
        Assert(cell);
        const checkbox = cell.querySelector("vscode-checkbox");
        Assert(checkbox);
        user.click(checkbox);
        const msg = await api.waitForMessage("checkboxToggled");
        Assert.strictEqual(msg.row, 1);
    });

});