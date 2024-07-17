/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { createCustomEvent } from "../events";
import { MessageService } from "../messageService";
import { MenuItem } from "../thrift/listwindow_types";
import { CellRightClickedEvent } from "./cell/cell";
import { SharedStyles } from "./styles/sharedStyles";
import { customElement } from "./utils";
import * as FloatingUi from "@floating-ui/dom";

interface PendingContextMenu {
    position: { x: number; y: number };
}

export class ContextMenuService {
    private element: ContextMenuElement | undefined = undefined;
    private pendingContextMenu: PendingContextMenu | undefined = undefined;

    constructor(
        appElement: HTMLElement,
        private readonly messageService: MessageService,
    ) {
        appElement.addEventListener("click", () => this.closeContextMenu());
        window.addEventListener("blur", () => this.closeContextMenu());

        this.messageService.addMessageHandler(msg => {
            if (msg.subject === "contextMenuReply") {
                this.resolvePendingContextMenu(msg.menu);
            }
        });
    }

    requestContextMenu(event: CellRightClickedEvent) {
        this.pendingContextMenu = {
            position: event.detail.clickPosition,
        };
        this.messageService.sendMessage({
            subject: "getContextMenu",
            col: event.detail.col,
            row: event.detail.row,
        });
    }

    private resolvePendingContextMenu(menuItems: MenuItem[]) {
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = undefined;
        }

        if (this.pendingContextMenu) {
            this.element = new ContextMenuElement();
            this.element.items = toTree(menuItems);
            this.element.addEventListener("context-menu-item-clicked", ev => {
                this.messageService.sendMessage({
                    subject: "contextItemClicked",
                    command: ev.detail.command,
                });
                this.element?.close();
            });
            document.body.appendChild(this.element);

            // Note that we cannot render the menu outside the view bounds (as a
            // "floating" window). It would just create a scrollbar for the entire
            // view.
            // Thus, we use the FloatingUI library to position & size the menu.
            const position = this.pendingContextMenu.position;
            const cursorElem: FloatingUi.VirtualElement = {
                getBoundingClientRect: () => {
                    return {
                        width: 0,
                        height: 0,
                        x: position.x,
                        y: position.y,
                        left: position.x,
                        top: position.y,
                        right: position.x,
                        bottom: position.y,
                    };
                },
            };
            FloatingUi.computePosition(cursorElem, this.element, {
                placement: "right-start",
                middleware: [FloatingUi.flip(), FloatingUi.shift()],
            }).then(({ x, y }) => {
                this.element?.open(x, y);
            });
        }

        this.pendingContextMenu = undefined;
    }

    private closeContextMenu() {
        if (this.element) {
            document.body.removeChild(this.element);
            this.element = undefined;
        }
        this.pendingContextMenu = undefined;
    }
}

export namespace ContextMenuItemClickEvent {
    export interface Detail {
        command: number;
    }
}

interface MenuItemTree {
    text: string;
    checked: boolean;
    enabled: boolean;
    command: number;
    children: MenuItemTree[];
}

function toTree(items: MenuItem[]): MenuItemTree[] {
    const result: MenuItemTree[] = [];

    while (true) {
        const front = items.shift();

        if (!front || front.text.startsWith("<")) {
            return result;
        } else if (front.text.startsWith(">")) {
            result.push({
                text: front.text.substring(1),
                checked: front.checked,
                enabled: front.enabled,
                command: front.command,
                children: toTree(items),
            });
        } else {
            result.push({
                ...front,
                children: [],
            });
        }
    }
}

@customElement("context-menu")
class ContextMenuElement extends HTMLElement {
    items: MenuItemTree[] = [];

    open(x: number, y: number) {
        Object.assign(this.style, {
            left: `${x}px`,
            top: `${y}px`,
        });

        // Fade in the tooltip
        this.style.opacity = "1";
        this.style.visibility = "visible";
    }

    close() {
        this.style.opacity = "0";
        this.style.visibility = "hidden";
    }

    connectedCallback() {
        this.classList.add(Styles.self);

        const list = document.createElement("div");
        list.classList.add(Styles.menu);
        this.appendChild(list);

        for (const item of this.items) {
            const listItem = new ContextMenuItemElement();
            listItem.item = item;
            list.appendChild(listItem);
        }
    }
}
@customElement("menu-item")
class ContextMenuItemElement extends HTMLElement {
    item: MenuItemTree | undefined = undefined;

    connectedCallback() {
        this.classList.add(Styles.menuItem);
        if (!this.item) {
            return;
        }
        this.classList.add(this.item.enabled ? Styles.menuItemEnabled : Styles.menuItemDisabled);

        if (this.item.text === "") {
            const separator = document.createElement("span");
            separator.classList.add(Styles.menuItemSeparator);
            this.appendChild(separator);
            return;
        }

        this.classList.add(Styles.menuItem);
        this.onclick = () => {
            if (this.item && this.item.enabled && this.item.command !== 0) {
                this.dispatchEvent(
                    createCustomEvent("context-menu-item-clicked", {
                        detail: {
                            command: this.item.command,
                        },
                        bubbles: true,
                    }),
                );
            }
        };

        const check = document.createElement("span");
        check.classList.add(Styles.icon, Styles.iconCheck);
        check.classList.add("codicon", "codicon-check");
        if (!this.item.checked) {
            check.style.visibility = "hidden";
        }
        this.appendChild(check);

        const label = document.createElement("span");
        label.innerText = this.item.text;
        label.classList.add(Styles.menuItemLabel);
        this.appendChild(label);

        if (this.item.children.length > 0) {
            const indicator = document.createElement("span");
            indicator.classList.add(Styles.icon, Styles.iconSubmenu);
            indicator.classList.add("codicon", "codicon-chevron-right");
            this.appendChild(indicator);

            if (this.item.enabled) {
                const subMenu = new ContextMenuElement();
                subMenu.items = this.item.children;
                this.appendChild(subMenu);

                this.onmouseenter = () => {
                    FloatingUi.computePosition(this, subMenu, {
                        placement: "right-start",
                        middleware: [FloatingUi.flip(), FloatingUi.shift()],
                    }).then(({ x, y }) => {
                        subMenu.open(x, y);
                    });
                };
                this.onmouseleave = () => {
                    subMenu.close();
                };
            }
        }
    }
}

namespace Styles {
    export const self = css({
        position: "absolute",
        top: 0,
        left: 0,
        width: "max-content",
        transition: "opacity 0.1s ease-in-out",
        opacity: 0,
        visibility: "hidden",
        zIndex: SharedStyles.ZIndices.ContextMenu,
    });
    export const menu = css({
        outline: "1px solid var(--vscode-menu-border)",
        borderRadius: "5px",
        color: "var(--vscode-menu-foreground)",
        backgroundColor: "var(--vscode-menu-background)",
        boxShadow: "0 2px 8px var(--vscode-widget-shadow)",
        padding: "4px 0",
        margin: 0,
        listStyleType: "none",
    });

    export const menuItem = css({
        cursor: "pointer",
        alignItems: "center",
        flex: "1 1 auto",
        display: "flex",
        height: "2em",
        color: "var(--vscode-menu-foreground)",
        position: "relative",
        margin: "0 4px",
        borderRadius: "4px",
    });

    export const menuItemDisabled = css({
        cursor: "default",
        color: "var(--vscode-disabledForeground)",
    });

    export const menuItemEnabled = css`
        &:hover {
            color: var(--vscode-menu-selectionForeground);
            background-color: var(--vscode-menu-selectionBackground);
            outline: 1px solid var(--vscode-menu-selectionBorder);
        },
    `;

    export const menuItemLabel = css({
        padding: "0 26px",
        maxHeight: "100%",
        flex: "1 1 auto",
    });
    export const menuItemSeparator = css({
        margin: "5px 0 !important",
        padding: 0,
        borderRadius: 0,
        width: "100%",
        height: "0px !important",
        display: "block",
        borderBottom: "1px solid var(--vscode-menu-separatorBackground)",
    });
    export const icon = css({
        width: "26px",
        height: "100%",
        position: "absolute",
        display: "flex !important",
        alignItems: "center",
        justifyContent: "center",
    });
    export const iconCheck = css({
        fontSize: "inherit !important",
    });
    export const iconSubmenu = css({
        right: 0,
    });
}