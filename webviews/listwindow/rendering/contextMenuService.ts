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
import { Serializable } from "../protocol";

interface PendingContextMenu {
    position: { x: number; y: number };
}

export class ContextMenuService {
    private pendingContextMenu: PendingContextMenu | undefined = undefined;
    private activeContextMenu: ContextMenu | undefined = undefined;

    constructor(
        private readonly container: HTMLElement,
        private readonly messageService: MessageService,
    ) {
        document.body.addEventListener("click", () => {
            this.closeContextMenu();
            this.pendingContextMenu = undefined;
        });
        window.addEventListener("blur", () => {
            this.closeContextMenu();
            this.pendingContextMenu = undefined;
        });

        this.messageService.addMessageHandler(msg => {
            if (msg.subject === "contextMenuReply") {
                this.resolvePendingContextMenu(msg.menu);
            }
        });

        container.addEventListener("context-menu-item-clicked", ev => {
            this.messageService.sendMessage({
                subject: "contextItemClicked",
                command: ev.detail.command,
            });
            this.closeContextMenu();
        });
    }

    requestContextMenu(event: CellRightClickedEvent["detail"]) {
        this.pendingContextMenu = {
            position: event.clickPosition,
        };
        this.messageService.sendMessage({
            subject: "getContextMenu",
            col: event.col,
            row: { value: event.row.toString() },
        });
    }

    private resolvePendingContextMenu(menuItems: Serializable<MenuItem>[]) {
        this.closeContextMenu();

        if (this.pendingContextMenu) {
            const items = toTree(menuItems);
            this.activeContextMenu = new ContextMenu(this.container, items);
            this.activeContextMenu.open(this.pendingContextMenu.position);
        }

        this.pendingContextMenu = undefined;
    }

    private closeContextMenu() {
        if (this.activeContextMenu) {
            this.activeContextMenu.close();
            this.activeContextMenu = undefined;
        }
    }
}

/**
 * Emitted by a {@link ContextMenuItemElement} when it is clicked.
 */
export namespace ContextMenuItemClickEvent {
    export interface Detail {
        command: number;
    }
}

/**
 * A more usable version of {@link MenuItem} that represents the tree structures
 * using references instead of string prefixes.
 */
interface MenuItemTree {
    text: string;
    checked: boolean;
    enabled: boolean;
    command: number;
    children: MenuItemTree[];
    parent: MenuItemTree | undefined;
}

function toTree(items: Serializable<MenuItem>[]): MenuItemTree[] {
    const result: MenuItemTree[] = [];

    while (true) {
        const front = items.shift();

        if (!front || front.text.startsWith("<")) {
            return result;
        } else if (front.text.startsWith(">")) {
            const menuItem: MenuItemTree = {
                text: front.text.substring(1),
                checked: front.checked,
                enabled: front.enabled,
                command: front.command,
                children: toTree(items),
                parent: undefined,
            };
            menuItem.children.forEach(child => child.parent = menuItem);
            result.push(menuItem);
        } else {
            result.push({
                ...front,
                children: [],
                parent: undefined,
            });
        }
    }
}

interface SubmenuState {
    // The menu item that opens the submenu
    readonly parentElement: ContextMenuItemElement;
    // The submenu itself (the list of subitems)
    readonly element: ContextMenuElement;
    parentHovered: boolean;
    menuHovered: boolean;
}

/**
 * Holds a single context menu and all its submenus. Handles opening and closing
 * of submenus when hovering over menu items.
 */
class ContextMenu {
    private readonly submenus: Map<MenuItemTree, SubmenuState> = new Map();
    private readonly rootMenu: ContextMenuElement;

    /**
     * Creates a new context menu from the given items, adding all elements to
     * the container.
     */
    constructor(private readonly container: HTMLElement, items: MenuItemTree[]) {
        this.rootMenu = new ContextMenuElement();
        container.appendChild(this.rootMenu);

        const createMenuItem = (item: MenuItemTree, menu: ContextMenuElement) => {
            const listItem = new ContextMenuItemElement();
            listItem.item = item;
            menu.appendChild(listItem);
            if (item.children.length > 0) {
                createSubmenu(item, listItem);
            }
        };
        const createSubmenu = (parentItem: MenuItemTree, parentElem: ContextMenuItemElement) => {
            parentElem.onmouseenter = () => {
                this.setSubmenuState(parentItem, { parentHovered: true });
            };
            parentElem.onmouseleave = () => {
                this.setSubmenuState(parentItem, { parentHovered: false });
            };

            const menu = new ContextMenuElement();
            this.container.appendChild(menu);
            menu.onmouseenter = () => {
                this.setSubmenuState(parentItem, { menuHovered: true });
            };
            menu.onmouseleave = () => {
                this.setSubmenuState(parentItem, { menuHovered: false });
            };

            this.submenus.set(parentItem, {
                parentElement: parentElem,
                element: menu,
                menuHovered: false,
                parentHovered: false,
            });

            for (const item of parentItem.children) {
                createMenuItem(item, menu);
            }
        };

        for (const item of items) {
            createMenuItem(item, this.rootMenu);
        }
    }

    /**
     * Opens the context menu at the given position.
     */
    open(position: { x: number; y: number }) {
        this.rootMenu.beforeOpen();

        // Note that we cannot render the menu outside the view bounds (as a
        // "floating" window). It would just create a scrollbar for the entire
        // view.
        // Thus, we use the FloatingUI library to position & size the menu.
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
        const options = { padding: 5 };
        FloatingUi.computePosition(cursorElem, this.rootMenu, {
            placement: "right-start",
            middleware: [
                FloatingUi.flip(options),
                FloatingUi.shift(options),
                FloatingUi.size({
                    ...options,
                    apply: params => {
                        this.rootMenu.style.maxHeight = `${Math.max(0, params.availableHeight)}px`;
                    },
                }),
            ],
        }).then(({ x, y }) => {
            this.rootMenu.open(x, y);
        });
    }

    /**
     * Closes the context menu and removes all its elements from the container.
     */
    close() {
        this.container.removeChild(this.rootMenu);
        for (const submenu of this.submenus.values()) {
            this.container.removeChild(submenu.element);
        }
    }

    /**
     * Sets (part of) the hover state of a submenu, and opens/closes the submenu
     * as appropriate. A submenu is opened if either the parent item or the menu
     * itself is hovered.
     */
    private setSubmenuState(parent: MenuItemTree, state: Partial<Omit<SubmenuState, "element">>) {
        const prevState = this.submenus.get(parent);
        if (prevState) {
            const newState: SubmenuState = {
                ...prevState,
                ...state,
            };
            this.submenus.set(parent, newState);

            const shouldBeOpen = newState.parentHovered || newState.menuHovered;
            if (shouldBeOpen) {
                this.openSubmenu(parent);
            } else {
                this.closeSubmenu(parent);
                if (parent.parent) {
                    // This forces any ancestor submenus to re-check whether
                    // they should still be open.
                    this.setSubmenuState(parent.parent, {});
                }
            }
        }
    }

    private openSubmenu(parent: MenuItemTree) {
        const submenu = this.submenus.get(parent);
        if (submenu) {
            // Ensure that all ancestor submenus are open too.
            if (parent.parent) {
                this.openSubmenu(parent.parent);
            }

            if (submenu.element.isOpen) {
                return;
            }

            submenu.element.beforeOpen();
            const options = { padding: 5 };
            FloatingUi.computePosition(submenu.parentElement, submenu.element, {
                placement: "right-start",
                middleware: [
                    FloatingUi.flip(options),
                    FloatingUi.shift(options),
                    FloatingUi.size({
                        ...options,
                        apply: params => {
                            submenu.element.style.maxHeight = `${Math.max(0, params.availableHeight)}px`;
                        },
                    }),
                ],
            }).then(({ x, y }) => {
                submenu.parentElement.setAttribute(
                    ContextMenuItemElement.ATTR_SUBMENU_OPEN,
                    "",
                );
                submenu.element.open(x, y);
            });
        }
    }

    private closeSubmenu(parent: MenuItemTree) {
        const submenu = this.submenus.get(parent);
        if (submenu && submenu.element.isOpen) {
            for (const child of parent.children) {
                this.closeSubmenu(child);
            }
            submenu.parentElement.removeAttribute(ContextMenuItemElement.ATTR_SUBMENU_OPEN);
            submenu.element.close();
        }
    }
}

@customElement("context-menu")
class ContextMenuElement extends HTMLElement {
    isOpen = false;

    // Ensures that the menu's size is calculated. Should be called before
    // calculating the menu's position.
    beforeOpen() {
        this.style.display = "block";
    }

    open(x: number, y: number) {
        this.isOpen = true;

        Object.assign(this.style, {
            left: `${x}px`,
            top: `${y}px`,
        });

        // Fade in the tooltip
        this.style.opacity = "1";
        this.style.visibility = "visible";
    }

    close() {
        this.isOpen = false;
        this.style.opacity = "0";
        this.style.visibility = "hidden";
    }

    connectedCallback() {
        this.classList.add(Styles.menu);
        this.style.opacity = "0";
        this.style.visibility = "hidden";
        this.style.display = "none";
    }
}
@customElement("menu-item")
class ContextMenuItemElement extends HTMLElement {
    /** HTML attribute set when this item's submenu is open */
    static readonly ATTR_SUBMENU_OPEN = "submenu-open";

    item: MenuItemTree | undefined = undefined;

    connectedCallback() {
        this.classList.add(Styles.menuItem);
        if (!this.item) {
            return;
        }
        this.classList.add(
            this.item.enabled || this.item.children.length > 0
                ? Styles.menuItemEnabled
                : Styles.menuItemDisabled,
        );

        if (this.item.text === "") {
            const separator = document.createElement("span");
            separator.classList.add(Styles.menuItemSeparator);
            this.appendChild(separator);
            return;
        }

        this.classList.add(Styles.menuItem);
        this.onclick = () => {
            if (this.item && this.item.enabled) {
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

        // The item text *may* contain a shortcut key, separated by a tab character.
        const labelParts = this.item.text.split("\t");

        const label = document.createElement("span");
        const labelText = labelParts[0] ?? this.item.text;
        // Ampersands are used to denote the shortcut key in the menu item text,
        // but we don't support that here.
        label.textContent = labelText.replaceAll("&", "");
        label.classList.add(Styles.menuItemLabel);
        this.appendChild(label);

        const shortcut = labelParts[1];
        if (shortcut) {
            const shortcutSpan = document.createElement("span");
            shortcutSpan.textContent = shortcut;
            shortcutSpan.classList.add(Styles.menuItemShortcut);
            this.appendChild(shortcutSpan);
        }

        if (this.item.children.length > 0) {
            const indicator = document.createElement("span");
            indicator.classList.add(Styles.icon, Styles.iconSubmenu);
            indicator.classList.add("codicon", "codicon-chevron-right");
            this.appendChild(indicator);
        }
    }
}

namespace Styles {
    export const menu = css({
        position: "absolute",
        top: 0,
        left: 0,
        boxSizing: "border-box",
        width: "max-content",
        transition: "opacity 0.1s ease-in-out",
        zIndex: SharedStyles.ZIndices.ContextMenu,
        maxHeight: "90vh",
        overflowY: "auto",
        outline: "1px solid var(--vscode-menu-border)",
        borderRadius: "5px",
        color: "var(--vscode-menu-foreground)",
        backgroundColor: "var(--vscode-menu-background)",
        boxShadow: "0 2px 8px var(--vscode-widget-shadow)",
        padding: "4px 0",
        margin: 0,
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
        &:hover, &[${ContextMenuItemElement.ATTR_SUBMENU_OPEN}] {
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
    export const menuItemShortcut = css({
        padding: "0 26px",
        maxHeight: "100%",
        flex: "2 1 auto",
        textAlign: "right",
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