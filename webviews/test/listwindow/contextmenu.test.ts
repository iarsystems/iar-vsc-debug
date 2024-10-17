/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Assert from "assert";
import { fireEvent, queries } from "@testing-library/dom";
import { TestUtils } from "./utils";
import { setupTestEnvironment } from "./testEnvironment";
import { MenuItem } from "iar-vsc-common/thrift/bindings/listwindow_types";

suite("Listwindow context menus", () => {
    test("Renders context menu", async() => {
        const { api, dom } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        await TestUtils.render(api, renderParams);

        const msgPromise = api.waitForMessage("getContextMenu");
        {
            const elem = dom.window.document.querySelector("#app")!.childNodes[0]!;
            fireEvent.contextMenu(elem);
        }
        await msgPromise;
        const menu = getMockMenu();
        api.postMessage({ subject: "contextMenuReply", menu: menu });

        await queries.findByText(
            dom.window.document.documentElement,
            menu[0]!.text,
        );

        const shortcutItem = menu.find(item => item.text.includes("\t"));
        Assert(shortcutItem);
        const parts = shortcutItem.text.split("\t");
        await queries.findByText(
            dom.window.document.documentElement,
            parts[0]!,
            { exact: true },
        );
        await queries.findByText(
            dom.window.document.documentElement,
            parts[1]!,
            { exact: true },
        );


        const checkedItem = menu.find(item => item.checked);
        if (checkedItem) {
            const elem = await queries.findByText(
                dom.window.document.documentElement,
                checkedItem.text,
            );
            const check = elem.parentElement!.querySelector(".codicon");
            Assert(check, "Found no icon next to checked element");
        }

        const expandableItem = menu.find(item => item.text.startsWith(">"));
        if (expandableItem) {
            const elem = await queries.findByText(
                dom.window.document.documentElement,
                expandableItem.text.substring(1),
            );
            const expandIcon = elem.parentElement!.querySelector(".codicon");
            Assert(expandIcon, "Found no icon next to expandable element");
        }
    });

    test("Sends message and closes on menu item click", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        await TestUtils.render(api, renderParams);

        const msgPromise = api.waitForMessage("getContextMenu");
        {
            const elem = dom.window.document.querySelector("#app")!.childNodes[0]!;
            fireEvent.contextMenu(elem);
        }
        await msgPromise;
        const menu = getMockMenu();
        api.postMessage({ subject: "contextMenuReply", menu: menu });

        const enabledItem = menu.find(item => item.enabled && item.command > 0);
        Assert(enabledItem);

        const elem = await queries.findByText(
            dom.window.document.documentElement,
            enabledItem.text,
        );
        user.click(elem);
        const clickMsg = await api.waitForMessage("contextItemClicked");
        Assert.strictEqual(clickMsg.command, enabledItem.command);
        Assert.strictEqual(elem.isConnected, false);
    });

    test("Cannot click disabled menu items", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        await TestUtils.render(api, renderParams);

        const msgPromise = api.waitForMessage("getContextMenu");
        {
            const elem = dom.window.document.querySelector("#app")!.childNodes[0]!;
            fireEvent.contextMenu(elem);
        }
        await msgPromise;
        const menu = getMockMenu();
        api.postMessage({ subject: "contextMenuReply", menu: menu });

        const disabledItem = menu.find(item => !item.enabled);
        Assert(disabledItem);

        const elem = await queries.findByText(
            dom.window.document.documentElement,
            disabledItem.text,
        );
        user.click(elem);
        try {
            await api.waitForMessage("contextItemClicked");
            Assert.fail("Received context click on disabled item");
        } catch { }
    });

    test("Opens submenus on hover", async() => {
        const { api, dom, user } = await setupTestEnvironment();

        const renderParams = TestUtils.generateRenderParameters();
        await TestUtils.render(api, renderParams);

        const msgPromise = api.waitForMessage("getContextMenu");
        {
            const elem = dom.window.document.querySelector("#app")!.childNodes[0]!;
            fireEvent.contextMenu(elem);
        }
        await msgPromise;
        const menu = getMockMenu();
        api.postMessage({ subject: "contextMenuReply", menu: menu });

        const expandableItem = menu.find(item => item.text.startsWith(">"));
        Assert(expandableItem);
        const expandableElem = await queries.findByText(
            dom.window.document.documentElement,
            expandableItem.text.substring(1),
        );
        user.hover(expandableElem);

        const subItem = menu[menu.indexOf(expandableItem) + 1]!;
        const subElem = await queries.findByText(
            dom.window.document.documentElement,
            subItem.text,
        );
        // It may take some time for the submenu to open
        await new Promise(res => setTimeout(res, 500));
        // Check that subElem is visible. This doesn't cover every possibility
        // (e.g. it might be hidden by a class), but it's probably good enough.
        let elem: HTMLElement | null = subElem;
        while (elem) {
            Assert.notStrictEqual(elem.style.display, "none", `${elem.tagName} is not displayed`);
            Assert.notStrictEqual(elem.style.visibility, "hidden", `${elem.tagName} is hidden`);
            elem = elem.parentElement;
        }
    });
});

function getMockMenu(): MenuItem[] {
    return [
        new MenuItem({
            checked: true,
            text: "CheckedItem",
            command: 1,
            enabled: true,
        }),
        new MenuItem({
            checked: true,
            text: "DisabledItem",
            command: 0,
            enabled: false,
        }),
        new MenuItem({
            checked: true,
            text: "WithShortcut\tShift+A",
            command: 0,
            enabled: false,
        }),
        new MenuItem({
            checked: false,
            text: ">Expandable",
            command: 0,
            enabled: true,
        }),
        new MenuItem({
            checked: false,
            text: "SubItem",
            command: 2,
            enabled: true,
        }),
        new MenuItem({
            checked: false,
            text: "<",
            command: 0,
            enabled: true,
        }),
    ];
}