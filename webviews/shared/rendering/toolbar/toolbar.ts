/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { customElement } from "../../utils";
import * as Items from "./toolbarItem";
import {
    ToolbarItem,
    ToolbarItemType,
    Tags,
} from "./toolbarConstants";
import { HoverService } from "../../../listwindow/rendering/hoverService";
import { BasicToolbarItem } from "./toolbarItem";
import { MessageService } from "../../../shared/messageService";
import { PropertyTreeItem } from "../../thrift/shared_types";
import { Serializable } from "../../protocol";

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

    private items: ToolbarItem[] = [];

    hoverService: HoverService | undefined = undefined;
    private toolbarContent: HTMLElement | undefined = undefined;
    private readonly toolbarItems: BasicToolbarItem[] = [];

    private readonly messageService: MessageService | undefined;
    private readonly definition: Serializable<PropertyTreeItem>;
    private readonly useVerticalLayout: boolean;

    constructor(
        def: Serializable<PropertyTreeItem>,
        msgService: MessageService | undefined,
        useVertialLayout = false,
    ) {
        super();
        this.messageService = msgService;
        this.definition = def;
        this.useVerticalLayout = useVertialLayout;
    }

    public getItemIds(): string[] {
        const ids: string[] = [];
        this.items.forEach(item => {
            ids.push(item.id);
        });
        return ids;
    }

    connectedCallback() {
        this.toolbarContent = document.createElement("div");
        this.toolbarContent.classList.add(
            this.useVerticalLayout
                ? Styles.vertialContent
                : Styles.horizontalContent,
        );

        this.items = this.parseDescription(this.definition);
        if (this.items.length > 0 && !this.useVerticalLayout) {
            this.toolbarContent.appendChild(this.separator);
        }

        this.toolbarItems.length = 0;
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
                    newItem = new Items.ToolbarItemText(
                        item,
                        true,
                        this.useVerticalLayout ? "start" : undefined,
                    );
                    break;
                }
                case ToolbarItemType.kKindEditTextDyn: {
                    newItem = new Items.ToolbarItemText(
                        item,
                        true,
                        this.useVerticalLayout ? "start" : undefined,
                    );
                    break;
                }
                case ToolbarItemType.kKindDisplayTextDyn:
                case ToolbarItemType.kKindDisplayText: {
                    newItem = new Items.ToolbarItemText(
                        item,
                        false,
                        this.useVerticalLayout ? "start" : undefined,
                    );
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
                this.toolbarItems.push(newItem);
                // Add handler for the messages.
                if (this.messageService) {
                    this.messageService.addMessageHandler(msg => {
                        newItem?.handleMessage(msg);
                    });
                }
            }
        }

        // Set the number of columns to match the number of items.
        //this.toolbarContent.style.gridTemplateColumns = cols;
        this.appendChild(this.toolbarContent);
    }

    parseDescription(def: Serializable<PropertyTreeItem>): ToolbarItem[] {
        const items: ToolbarItem[] = [];

        // Unpack the tree and create all the items that we
        // want to generate to the toolbar.
        def.children.forEach((value: Serializable<PropertyTreeItem>) => {
            const newItem = this.unpackItem(value);
            if (newItem.type === ToolbarItemType.kKindUnknown) {
                return;
            }
            items.push(newItem);
        });
        return items;
    }

    collectContent(): Serializable<PropertyTreeItem> {
        return {
            key: "ROOT",
            value: "NONE",
            children: this.toolbarItems.map(item => {
                return item.packForForm();
            }),
        };
    }

    unpackItem(item: Serializable<PropertyTreeItem>): ToolbarItem {
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
        item.children.forEach((subItem: Serializable<PropertyTreeItem>) => {
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
    export const horizontalContent = css({
        width: "100%",
        height: `${ToolbarElement.TOOLBAR_HEIGHT}px`,
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        columnGap: "4px",
        justifyContent: "flex-start",
    });
    export const vertialContent = css({
        width: "100%",
        display: "grid",
        alignItems: "start",
        marginLeft: "10px",
        marginRight: "10px",
        rowGap: "5px",
    });
}
