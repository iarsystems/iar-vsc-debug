/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { customElement } from "../utils";
import * as Items from "./toolbarItem";
import {
    ToolbarItem,
    TreeData,
    ToolbarItemType,
    Tags,
} from "./toolbarConstants";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { unpackTree } from "./toolbarUtils";
import { HoverService } from "../hoverService";
import { BasicToolbarItem } from "./toolbarItem";

@customElement("listwindow-toolbar")
export class ToolbarElement extends HTMLElement {
    static TOOLBAR_HEIGHT = 22;
    // Keep a seperator
    private readonly separator = new Items.ToolbarItemSeparator({
        type: ToolbarItemType.kKindSpacing,
        id: "",
        itemKey: "",
        bool: true,
        text: "",
        text2: "",
        stringList: [],
    });

    items: ToolbarItem[] = [];
    hoverService: HoverService | undefined = undefined;
    private toolbarContent: HTMLElement | undefined = undefined;
    private readonly definition: string;

    constructor(def: string) {
        super();
        this.definition = def;
    }

    connectedCallback() {
        this.toolbarContent = document.createElement("div");
        this.toolbarContent.classList.add(Styles.content);

        this.items = this.parseDescription(this.definition);
        if (this.items.length > 0) {
            this.toolbarContent.appendChild(this.separator);
        }

        for (const item of this.items) {
            let newItem: BasicToolbarItem | undefined = undefined;

            switch (item.type) {
                case ToolbarItemType.kKindTextButton:
                case ToolbarItemType.kKindIconButton: {
                    newItem = new Items.ToolbarItemButton(item);
                    break;
                }
                case ToolbarItemType.kKindTextCheck: {
                    newItem = new Items.ToolbarItemSimpleCheckBox(item);
                    break;
                }
                case ToolbarItemType.kKindIconCheck: {
                    newItem = new Items.ToolbarItemCheckBox(item);
                    break;
                }
                case ToolbarItemType.kKindEditText: {
                    newItem = new Items.ToolbarItemText(item, true);
                    break;
                }
                case ToolbarItemType.kKindEditTextDyn: {
                    newItem = new Items.ToolbarItemText(item, true);
                    break;
                }
                case ToolbarItemType.kKindDisplayTextDyn:
                case ToolbarItemType.kKindDisplayText: {
                    newItem = new Items.ToolbarItemText(item, false);
                    break;
                }
                case ToolbarItemType.kKindTextMenu:
                case ToolbarItemType.kKindIconMenu: {
                    newItem = new Items.ToolbarItemIconMenu(item);
                    break;
                }
                case ToolbarItemType.kKindSelectMenuDyn:
                case ToolbarItemType.kKindSelectMenu: {
                    newItem = new Items.ToolbarItemCombo(item);
                    break;
                }
                case ToolbarItemType.kKindProgressBar:
                case ToolbarItemType.kKindProgressBarDyn:
                case ToolbarItemType.kKindStackProgressBarDyn:
                case ToolbarItemType.kKindStackProgressBar: {
                    newItem = new Items.ToolbarItemProgress(item);
                    break;
                }
                case ToolbarItemType.kKindCommandButton:
                    break;
                case ToolbarItemType.kKindSpacing:
                case ToolbarItemType.kKindSeparator: {
                    newItem = new Items.ToolbarItemSeparator(item);
                    break;
                }
                default:
                    break;
            }

            if (newItem !== undefined) {
                newItem.hoverService = this.hoverService;
                this.toolbarContent.appendChild(newItem);
            }
        }

        // Set the number of columns to match the number of items.
        //this.toolbarContent.style.gridTemplateColumns = cols;
        this.appendChild(this.toolbarContent);
    }

    parseDescription(def: string): ToolbarItem[] {
        // Check that the given definition is ok.
        if (!XMLValidator.validate(def)) {
            console.error(`Failed to parse toolbar definition: ${def}`);
            return [];
        }
        // Parse the given definition.
        const parser = new XMLParser();
        const parsedDef = parser.parse(def);

        const items: ToolbarItem[] = [];

        // Unpack the tree and create all the items that we
        // want to generate to the toolbar.
        const parsedTree = unpackTree(parsedDef.tree);
        parsedTree.children.forEach((value: TreeData) => {
            const newItem = this.unpackItem(value);
            if (newItem.type === ToolbarItemType.kKindUnknown) {
                return;
            }
            items.push(newItem);
        });
        return items;
    }

    unpackItem(item: TreeData): ToolbarItem {
        // Iterate over the items keys and store the information.
        const toolbarItem: ToolbarItem = {
            itemKey: item.key,
            id: "",
            type: ToolbarItemType.kKindUnknown,
            text: "",
            text2: "",
            stringList: [],
            bool: false,
        };

        // Handle the information stored in the children
        item.children.forEach((subItem: TreeData) => {
            const key: string = subItem.key;
            switch (key) {
                case Tags.kKeyItemKind:
                    toolbarItem.type = subItem.value as ToolbarItemType;
                    break;
                case Tags.kKeyItemStr:
                    toolbarItem.text = subItem.value;
                    break;
                case Tags.kKeyItemStr2:
                    toolbarItem.text2 = subItem.value;
                    break;
                case Tags.kKeyItemId:
                    toolbarItem.id = subItem.value;
                    break;
                case Tags.kKeyItemStringList:
                    // This stores information in a list defined by the children.
                    for (const iy in subItem.children) {
                        const listEntry = subItem.children[iy];
                        if (listEntry !== undefined) {
                            const index: number = parseInt(listEntry.key);
                            toolbarItem.stringList[index] = listEntry.value;
                        }
                    }
                    break;
                case Tags.kKeyItemBool:
                    toolbarItem.bool = subItem.value === "1";
                    break;
                default:
                    // Just discard the entry.
                    console.error(`Unknown key "${key}" in ${subItem}"`);
                    return;
            }
        });
        return toolbarItem;
    }
}

namespace Styles {
    export const content = css({
        width: "100%",
        height: `${ToolbarElement.TOOLBAR_HEIGHT}px`,
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        columnGap: "4px",
        justifyContent: "flex-start",
    });
}
