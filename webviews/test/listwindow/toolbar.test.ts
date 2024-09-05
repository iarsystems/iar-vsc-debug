/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as Assert from "assert";
import {
    packTree,
    unpackTree,
} from "../../../webviews/listwindow/rendering/toolbar/toolbarUtils";
import { TreeData } from "../../listwindow/rendering/toolbar/toolbarConstants";
import { setupTestEnvironment } from "./testEnvironment";
import { TestUtils } from "./utils";
import { fireEvent, queries } from "@testing-library/dom";
import { Checkbox } from "@vscode/webview-ui-toolkit";

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

suite("IfPropertyTree", () => {
    test("Unpack description", () => {
        const data: TreeData = unpackTree(TestData.TestDescription);
        Assert.strictEqual(data.key, "ROOT");
        // Ensure that we've collected all twelve kids.
        Assert.strictEqual(data.children.length, 12);

        // Try to locate an item in the list.
        const item8 = data.children.find((value: TreeData) => {
            return value.key === "ITEM8";
        });
        Assert.ok(item8 !== undefined);
        Assert.strictEqual(FindItemValue(item8, "TEXT"), "MC");
        Assert.strictEqual(FindItemValue(item8, "KIND"), "SELECTMENU");
        Assert.strictEqual(FindItemValue(item8, "0"), "Alfa");
        Assert.strictEqual(FindItemValue(item8, "2"), "Gamma");
    }),
    test("Pack tree", () => {
        const tree = packTree(TestData.TestTree, false);
        Assert.ok(tree.length > 0);
    }),
    test("Unpack + pack", () => {
        const unpacked: TreeData = unpackTree(TestData.TestDescription);
        // Pack the newly unpacked tree and ensure that we get the
        // same as we started with.
        const packed = packTree(unpacked, false);
        // Clean the description to make the comparison work.
        const modded = TestData.TestDescription.replaceAll(/\n\s+|\n/g, "");
        Assert.strictEqual(modded, packed);
    });
});

suite("Listwindow Toolbar", () => {
    test("Buttons...", async() => {
        const { api, dom, user } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            packTree(TestData.ButtonToolbar, false),
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
            packTree(TestData.EditToolbar, false),
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
            packTree(TestData.CheckBoxToolbar, false),
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
            packTree(TestData.DropDownToolbar, false),
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
        Assert.ok(!item.properties.includes("item1"));
        Assert.ok(item.properties.includes("item2"));
    }),
    test("Icon dropdown...", async() => {
        const { api, dom, user } = await setupTestEnvironment();
        await TestUtils.renderToolbar(
            api,
            packTree(TestData.IconDropDown, false),
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
    export const TestTree: TreeData = {
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

    export const ButtonToolbar: TreeData = {
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

    export const EditToolbar: TreeData = {
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

    export const CheckBoxToolbar: TreeData = {
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

    export const DropDownToolbar: TreeData = {
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

    export const IconDropDown: TreeData = {
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

    export const TestDescription = `<tree>
<key>ROOT</key>
<value>NONE</value>
<children>
    <tree>
      <key>ITEM0</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>first</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>100</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>TEXTBUTTON</value>
          <children/>
        </tree>
        <tree>
          <key>STRINGLIST</key>
          <value>LIST</value>
          <children>
            <tree>
              <key>0</key>
              <value>first</value>
              <children/>
            </tree>
            <tree>
              <key>1</key>
              <value>Huppladuffing</value>
              <children/>
            </tree>
          </children>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM1</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>Huppladuffing</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>300</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>TEXTBUTTON</value>
          <children/>
        </tree>
        <tree>
          <key>STRINGLIST</key>
          <value>LIST</value>
          <children>
            <tree>
              <key>0</key>
              <value>first</value>
              <children/>
            </tree>
            <tree>
              <key>1</key>
              <value>Huppladuffing</value>
              <children/>
            </tree>
          </children>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM2</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>MORE</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>-1</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>SPACING</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM3</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>IDI_DBU_TRACE_CLEAR</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>200</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>ICONBUTTON</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM4</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>LESS</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>-1</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>SPACING</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM5</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>IDI_DBU_TRACE_BROWSE</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>400</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>ICONBUTTON</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM6</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>Check</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>500</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>TEXTCHECK</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM7</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>IDI_DBU_TRACE_ONOFF</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>600</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>ICONCHECK</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM8</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>MC</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>700</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>SELECTMENU</value>
          <children/>
        </tree>
        <tree>
          <key>STRINGLIST</key>
          <value>LIST</value>
          <children>
            <tree>
              <key>0</key>
              <value>Alfa</value>
              <children/>
            </tree>
            <tree>
              <key>1</key>
              <value>Beta</value>
              <children/>
            </tree>
            <tree>
              <key>2</key>
              <value>Gamma</value>
              <children/>
            </tree>
          </children>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM9</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>Display:</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>800</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>DISPLAYTEXT</value>
          <children/>
        </tree>
        <tree>
          <key>TEXT2</key>
          <value>Samla mammas manna</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM10</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>Hmm...</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>900</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>ICONMENU</value>
          <children/>
        </tree>
      </children>
    </tree>
    <tree>
      <key>ITEM11</key>
      <value>NONE</value>
      <children>
        <tree>
          <key>TEXT</key>
          <value>Editlabel</value>
          <children/>
        </tree>
        <tree>
          <key>ID</key>
          <value>1000</value>
          <children/>
        </tree>
        <tree>
          <key>KIND</key>
          <value>EDITTEXT</value>
          <children/>
        </tree>
        <tree>
          <key>TEXT2</key>
          <value>Lagom bred eller hur</value>
          <children/>
        </tree>
        <tree>
          <key>BOOL</key>
          <value>1</value>
          <children/>
        </tree>
      </children>
    </tree>
  </children>
</tree>`;
}
