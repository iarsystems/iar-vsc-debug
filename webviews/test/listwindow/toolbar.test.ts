/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import { TreeData } from "../../listwindow/rendering/toolbar/toolbarConstants";
import { setupTestEnvironment } from "./testEnvironment";
import { TestUtils } from "./utils";
import { fireEvent, queries } from "@testing-library/dom";
import { Checkbox } from "@vscode/webview-ui-toolkit";
import { PropertyTreeItem } from "../../listwindow/thrift/shared_types";
import { Serializable } from "../../listwindow/protocol";

export function FindItemValue(
    start: TreeData,
    key: string,
): string | undefined {
    for (let i = 0; i < start.children.length; i++) {
        const child = start.children[i];
        if (child === undefined) {
            continue;
        }

        if (child.key === key) {
            return start.children[i]?.value;
        } else {
            const val = FindItemValue(child, key);
            if (val !== undefined) {
                return val;
            }
        }
    }
    return undefined;
}

export async function FindByLabel(
    root: HTMLElement,
    label: string,
): Promise<Element | undefined> {
    const labelElement = await queries.findByText(root, label);
    if (labelElement !== undefined && labelElement.parentElement !== null) {
        if (labelElement.parentElement.childElementCount === 2) {
            const e1 = labelElement.parentElement.children.item(1);
            if (e1 !== null) {
                const e2 = e1.children.item(0);
                return e2 as Element;
            }
        }
    }
    return undefined;
}

// Look for an element matching the predicate. Favours depth before same level.
export function FindElement(
    root: HTMLElement,
    predicate: (e: HTMLElement) => boolean,
): HTMLElement | undefined {
    if (predicate(root)) {
        return root;
    }

    for (let i = 0; i < root.childElementCount; i++) {
        const childElem = root.children.item(i);
        if (childElem) {
            const result = FindElement(childElem as HTMLElement, predicate);
            if (result !== undefined) {
                return result;
            }
        }
    }
    return undefined;
}

suite("Listwindow Toolbar", () => {
    test("Buttons...", async() => {
        const { api, dom, user } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            TestData.ButtonToolbar,
        );

        let button = await queries.findByText(
            dom.window.document.documentElement,
            "foo",
        );
        Assert.ok(button);
        user.click(button);
        let item = await api.waitForMessage("toolbarItemInteraction");
        Assert.strictEqual(item.id, "button1");

        button = await queries.findByText(
            dom.window.document.documentElement,
            "bar",
        );
        Assert.ok(button);
        user.click(button);
        item = await api.waitForMessage("toolbarItemInteraction");
        Assert.strictEqual(item.id, "button2");
    }),
    test("Edits...", async() => {
        const { api, dom } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            TestData.EditToolbar,
        );
        const edit = (await FindByLabel(
            dom.window.document.documentElement,
            "Label",
        )) as HTMLInputElement;
        Assert.ok(edit);
        const pending = api.waitForMessage("toolbarItemInteraction", 4000);
        edit.value = "test";
        fireEvent.keyDown(edit, { key: "Enter" });
        const item = await pending;
        Assert.strictEqual(item.id, "edit");
    }),
    test("Checkboxes...", async() => {
        const { api, dom, user } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            TestData.CheckBoxToolbar,
        );

        const button = (await queries.findByText(
            dom.window.document.documentElement,
            "TextCheck",
        )) as Checkbox;

        Assert.ok(button);
        Assert.ok(!button.checked); // Should not be checked.

        // Click the checkbox
        user.click(button);
        let item = await api.waitForMessage("toolbarItemInteraction");
        Assert.strictEqual(item.id, "check1");
        Assert.ok(button.checked); // Should now be checked.

        const label = FindElement(
            dom.window.document.documentElement,
            (e: HTMLElement) => {
                return e.classList.contains("codicon");
            },
        );

        Assert.ok(label);
        // Click the label and assert that the correct message
        // is included.
        user.click(label);
        item = await api.waitForMessage("toolbarItemInteraction");
        Assert.strictEqual(item.id, "check2");
    }),
    test("Dropdown...", async() => {
        const { api, dom, user } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            TestData.DropDownToolbar,
        );

        const option = (await queries.findByText(
            dom.window.document.documentElement,
            "item2",
        )) as HTMLOptionElement;
        Assert.ok(option);
        Assert.ok(!option.selected);

        const test = await queries.findByRole(
            dom.window.document.documentElement,
            "combobox",
        );
        Assert.ok(test);

        const select = option.parentElement as HTMLSelectElement;
        Assert.ok(select);

        // Select the option and wait for the OK.
        user.click(option);
        const item = await api.waitForMessage("toolbarItemInteraction");
        Assert.strictEqual(select.value, "item2");

        // Check that the correct option has been selected and
        // that the item contains the packaged item id.
        Assert.ok(option.selected);
        Assert.strictEqual(item.id, "select");
        Assert.ok(!item.properties.children[1]?.value.includes("item1"));
        Assert.ok(item.properties.children[1]?.value.includes("item2"));
        Assert.strictEqual(item.properties.children[0]?.value, "1");
    }),
    test("Icon dropdown...", async() => {
        const { api, dom, user } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            TestData.IconDropDown,
        );

        const anchor = (await queries.findByText(
            dom.window.document.documentElement,
            "item2",
        )) as HTMLAnchorElement;
        Assert.ok(anchor);

        // Get the dropdown which should be invisible now.
        const dropdown = anchor.parentElement as HTMLDivElement;
        Assert.ok(dropdown);

        // Click the expand button.
        Assert.ok(dropdown.parentElement);
        Assert.ok(dropdown.parentElement.children.length > 0);
        const expandButton = dropdown.parentElement.children.item(
            0,
        ) as HTMLButtonElement;
        Assert.ok(expandButton);

        user.click(anchor);
        const item = await api.waitForMessage("toolbarItemInteraction");
        Assert.strictEqual(item.id, "icondrop");
    });
});

namespace TestData {
    export const TestTree: Serializable<PropertyTreeItem> = {
        key: "root",
        value: "some_val",
        children: [
            { key: "first", value: "", children: [] },
            {
                key: "second",
                value: "foo",
                children: [{ key: "second_child", value: "bar", children: [] }],
            },
        ],
    };

    export const ButtonToolbar: Serializable<PropertyTreeItem> = {
        key: "ROOT",
        value: "NONE",
        children: [
            {
                key: "first",
                value: "",
                children: [
                    { key: "ID", value: "button1", children: [] },
                    { key: "KIND", value: "TEXTBUTTON", children: [] },
                    { key: "TEXT", value: "foo", children: [] },
                ],
            },
            {
                key: "second",
                value: "",
                children: [
                    { key: "ID", value: "button2", children: [] },
                    { key: "KIND", value: "TEXTBUTTON", children: [] },
                    { key: "TEXT", value: "bar", children: [] },
                ],
            },
        ],
    };

    export const EditToolbar: Serializable<PropertyTreeItem> = {
        key: "ROOT",
        value: "NONE",
        children: [
            {
                key: "first",
                value: "",
                children: [
                    { key: "ID", value: "edit", children: [] },
                    { key: "KIND", value: "EDITTEXT", children: [] },
                    { key: "TEXT", value: "Label", children: [] },
                    { key: "TEXT2", value: "content", children: [] },
                ],
            },
        ],
    };

    export const CheckBoxToolbar: Serializable<PropertyTreeItem> = {
        key: "ROOT",
        value: "NONE",
        children: [
            {
                key: "first",
                value: "",
                children: [
                    { key: "ID", value: "check1", children: [] },
                    { key: "KIND", value: "TEXTCHECK", children: [] },
                    { key: "TEXT", value: "TextCheck", children: [] },
                ],
            },
            {
                key: "second",
                value: "",
                children: [
                    { key: "ID", value: "check2", children: [] },
                    { key: "KIND", value: "ICONCHECK", children: [] },
                    { key: "TEXT", value: "SomeText", children: [] },
                ],
            },
        ],
    };

    export const DropDownToolbar: Serializable<PropertyTreeItem> = {
        key: "ROOT",
        value: "NONE",
        children: [
            {
                key: "first",
                value: "",
                children: [
                    { key: "ID", value: "select", children: [] },
                    { key: "KIND", value: "SELECTMENU", children: [] },
                    { key: "TEXT", value: "MenuLabel", children: [] },
                    { key: "TEXT2", value: "content", children: [] },
                    {
                        key: "STRINGLIST",
                        value: "",
                        children: [
                            { key: "0", value: "item1", children: [] },
                            { key: "1", value: "item2", children: [] },
                        ],
                    },
                ],
            },
        ],
    };

    export const IconDropDown: Serializable<PropertyTreeItem> = {
        key: "ROOT",
        value: "NONE",
        children: [
            {
                key: "first",
                value: "",
                children: [
                    { key: "ID", value: "icondrop", children: [] },
                    { key: "KIND", value: "ICONMENU", children: [] },
                    { key: "TEXT", value: "IconLabel", children: [] },
                    {
                        key: "STRINGLIST",
                        value: "",
                        children: [
                            { key: "0", value: "item1", children: [] },
                            { key: "1", value: "item2", children: [] },
                        ],
                    },
                ],
            },
        ],
    };
}
