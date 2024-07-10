/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../events";
import { MessageService } from "../messageService";
import { MenuItem } from "../thrift/listwindow_types";
import { CellRightClickedEvent } from "./cell/cell";
import { createCss } from "./styles/createCss";
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
    private static readonly STYLES: CSSStyleSheet = createCss({
        ":host": {
            position: "absolute",
            top: 0,
            left: 0,
            width: "max-content",
            transition: "opacity 0.1s ease-in-out",
            opacity: 0,
            visibility: "hidden",
            "z-index": SharedStyles.ZIndices.ContextMenu,
        },
        ".menu": {
            // overflow: "hidden",
            outline: "1px solid var(--vscode-menu-border)",
            "border-radius": "5px",
            color: "var(--vscode-menu-foreground)",
            "background-color": "var(--vscode-menu-background)",
            "box-shadow": "0 2px 8px var(--vscode-widget-shadow)",
            padding: "4px 0",
            margin: 0,
            "list-style-type": "none",
        },

        // "menu-item": {
        // },
        "menu-item>div": {
            cursor: "pointer",
            "align-items": "center",
            flex: "1 1 auto",
            display: "flex",
            height: "2em",
            color: "var(--vscode-menu-foreground)",
            position: "relative",
            margin: "0 4px",
            "border-radius": "4px",
        },
        "menu-item.disabled>div": {
            cursor: "default",
            color: "var(--vscode-disabledForeground)",
        },
        "menu-item:hover:not(.disabled)>div": {
            color: "var(--vscode-menu-selectionForeground)",
            "background-color": "var(--vscode-menu-selectionBackground)",
            outline: "1px solid var(--vscode-menu-selectionBorder)",
        },

        ".menu-item-label": {
            padding: "0 26px",
            "max-height": "100%",
            flex: "1 1 auto",
        },
        ".menu-item-separator": {
            margin: "5px 0 !important",
            padding: 0,
            "border-radius": 0,
            width: "100%",
            height: "0px !important",
            display: "block",
            "border-bottom": "1px solid var(--vscode-menu-separatorBackground)",
        },
        ".menu-item-check, .submenu-indicator": {
            width: "26px",
            height: "100%",
            position: "absolute",
            display: "flex !important",
            "align-items": "center",
            "justify-content": "center",
        },
        ".menu-item-check": {
            "font-size": "inherit !important",
        },
        ".submenu-indicator": {
            right: 0,
        },
    });

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
        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(ContextMenuElement.STYLES);
        shadow.adoptedStyleSheets.push(...SharedStyles.STYLES);

        const list = document.createElement("div");
        list.classList.add("menu");
        shadow.appendChild(list);

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
        if (!this.item) {
            return;
        }
        if (!this.item.enabled) {
            this.classList.add("disabled");
        }

        if (this.item.text === "") {
            const separator = document.createElement("span");
            separator.classList.add("menu-item-separator");
            this.appendChild(separator);
            return;
        }

        const listItem = document.createElement("div");
        listItem.onclick = () => {
            if (this.item && this.item.enabled && this.item.command !== 0) {
                this.dispatchEvent(
                    createCustomEvent("context-menu-item-clicked", {
                        detail: {
                            command: this.item.command,
                        },
                        bubbles: true,
                        composed: true,
                    }),
                );
            }
        };
        this.appendChild(listItem);

        const check = document.createElement("span");
        check.classList.add("menu-item-check");
        check.classList.add("codicon", "codicon-check");
        if (!this.item.checked) {
            check.style.visibility = "hidden";
        }
        listItem.appendChild(check);

        const label = document.createElement("span");
        label.innerText = this.item.text;
        label.classList.add("menu-item-label");
        listItem.appendChild(label);

        if (this.item.children.length > 0) {
            const indicator = document.createElement("span");
            indicator.classList.add("submenu-indicator");
            indicator.classList.add("codicon", "codicon-chevron-right");
            listItem.appendChild(indicator);

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
