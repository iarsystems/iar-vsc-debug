/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { customElement } from "../utils";
import { ToolbarItem, ToolbarItemType, TreeData } from "./toolbarConstants";
import { createCustomEvent } from "../../events";
import { packTree, VsCodeIconMap } from "./toolbarUtils";
import { Checkbox } from "@vscode/webview-ui-toolkit/dist/checkbox";
import { Button } from "@vscode/webview-ui-toolkit/dist/button";
import { Dropdown } from "@vscode/webview-ui-toolkit/dist/dropdown";
import { SharedStyles } from "../styles/sharedStyles";
import { HoverService } from "../hoverService";

export type ToolbarItemEvent = CustomEvent<ToolbarItemEvent.Detail>;
export namespace ToolbarItemEvent {
    export interface Detail {
        id: string;
        properties: string;
    }
}

export type ToolbarItemHoveredEvent =
    CustomEvent<ToolbarItemHoveredEvent.Detail>;
export namespace ToolbarItemHoveredEvent {
    export interface Detail {
        id: string;
        hoverPosition: { x: number; y: number };
        fallbackInfo: string;
    }
}

function addVsCodeIcon(
    element: HTMLElement,
    iconId: string,
    defaultImage = "kebab-vertical",
): void {
    const iconSpec = VsCodeIconMap.get(iconId);
    if (iconSpec !== undefined) {
        element.classList.add("codicon", `codicon-${iconId[0]}`);
        if (iconSpec[1] !== undefined) {
            element.style.color = iconSpec[1] as string;
        }
    } else {
        element.classList.add("codicon", `codicon-${defaultImage}`);
    }
}

export interface State {
    enabled: boolean;
    visible: boolean;
    on: boolean;
    detail: number;
    str: string;
}

export abstract class BasicToolbarItem extends HTMLElement {
    protected readonly definition: ToolbarItem;
    public hoverService: HoverService | undefined = undefined;

    // Implemented by subclass
    abstract updateState(state: State): void;

    addHover(element: HTMLElement): void {
        this.hoverService?.registerHoverElement(
            element,
            this.definition.id,
            pos => {
                this.dispatchEvent(
                    createCustomEvent("toolbar-item-hovered", {
                        detail: {
                            hoverPosition: {
                                x: pos.clientX,
                                y: pos.clientY,
                            },
                            fallbackInfo: this.definition.text,
                            id: this.definition.id,
                        },
                        bubbles: true,
                    }),
                );
            },
        );
    }

    constructor(def: ToolbarItem) {
        super();
        this.definition = def;
    }
}

@customElement("listwindow-toolbar-separator")
export class ToolbarItemSeparator extends BasicToolbarItem {
    constructor(def: ToolbarItem) {
        super(def);
    }

    updateState(_state: State): void {
        // Do nothing.
    }

    connectedCallback() {
        const separator = document.createElement("div");
        if (this.definition.type === ToolbarItemType.kKindSeparator) {
            separator.classList.add(Styles.separator);
        } else {
            separator.classList.add(Styles.spacing);
        }
        this.appendChild(separator);
    }
}

@customElement("listwindow-toolbar-text")
export class ToolbarItemText extends BasicToolbarItem {
    private edit: HTMLInputElement | HTMLDivElement | undefined;

    // For the edit.
    private readonly editable;
    private historyCanvas: HTMLDivElement | undefined;
    private readonly NO_HISTORY_ELEMS = 10;
    private history: string[] = [];
    private readonly historyElements: HTMLAnchorElement[] = [];

    constructor(def: ToolbarItem, isEditable = false) {
        super(def);
        this.editable = isEditable;
    }

    updateState(state: State): void {
        if (this.edit === undefined) {
            return;
        }
        this.edit.style.display = state.visible ? "block" : "none";
        if (this.editable) {
            this.edit.contentEditable = state.enabled ? "true" : "false";
        }
        this.edit.textContent = state.str;
    }

    updateHistory(element: string): void {
        // Places the element first in the list.
        this.history.unshift(element);

        // Drop overflowing history.
        if (this.history.length > this.NO_HISTORY_ELEMS) {
            this.history = this.history.slice(this.NO_HISTORY_ELEMS - 1);
        }

        for (let i = 0; i < this.NO_HISTORY_ELEMS; i++) {
            let content: string | undefined = "";
            if (i < this.history.length) {
                content = this.history[i];
            }
            const hElement = this.historyElements[i];
            if (hElement) {
                hElement.textContent = content as string;
            }
        }
    }

    connectedCallback() {
        const canvas = document.createElement("div");
        canvas.classList.add(Styles.twoGrid);

        const label = document.createElement("div");
        label.textContent = this.definition.text;
        label.classList.add(Styles.basicText);
        canvas.appendChild(label);

        if (this.editable) {
            const editCanvas = document.createElement("div");

            // The simple edit.
            this.edit = document.createElement("input");
            this.edit.setAttribute("type", "text");
            this.edit.setAttribute("size", "20");
            this.edit.id = this.definition.id;
            this.edit.onkeydown = ev => {
                if (
                    ev.key === "Enter" &&
                    this.edit instanceof HTMLInputElement
                ) {
                    const content = this.edit?.value;
                    if (!content || content.length === 0) {
                        return;
                    }

                    //Insert the element into history.
                    this.updateHistory(content as string);

                    this.dispatchEvent(
                        createCustomEvent("toolbar-item-interaction", {
                            detail: {
                                id: this.definition.id,
                                properties: content as string,
                            },
                            bubbles: true,
                        }),
                    );

                    ev.preventDefault();
                    ev.stopImmediatePropagation();
                    this.edit.blur();
                }
            };
            this.edit.classList.add(Styles.editLeft);
            this.edit.classList.add(Styles.clickable);
            editCanvas.appendChild(this.edit);

            // The history canvas
            this.historyCanvas = document.createElement("div");
            // Create the dropdown menu
            for (let i = 0; i < this.NO_HISTORY_ELEMS; i++) {
                const element = document.createElement("a");
                element.onmousedown = ev => {
                    if (
                        ev.button !== 0 || // only accept right clicks
                        this.edit === undefined ||
                        element.textContent === "" ||
                        !(this.edit instanceof HTMLInputElement)
                    ) {
                        return;
                    }
                    this.edit.value = element.textContent as string;
                    this.dispatchEvent(
                        createCustomEvent("toolbar-item-interaction", {
                            detail: {
                                id: this.definition.id,
                                properties: element.textContent as string,
                            },
                            bubbles: true,
                        }),
                    );

                    this.updateHistory(element.textContent as string);
                };
                element.classList.add(Styles.dropdownLabel);

                this.historyElements.push(element);
                this.historyCanvas.appendChild(element);
            }

            this.historyCanvas.classList.add(Styles.dropdownContent);
            editCanvas.appendChild(this.historyCanvas);

            canvas.appendChild(editCanvas);

            this.edit.onfocus = _ev => {
                if (this.historyCanvas !== undefined) {
                    this.historyCanvas.style.display = "block";
                    if (this.edit) {
                        this.edit.style.outline = `1px solid var(--vscode-focusBorder)`;
                    }
                }
            };

            this.edit.addEventListener(
                "focusout",
                (_ev: Event) => {
                    if (this.historyCanvas !== undefined) {
                        this.historyCanvas.style.display = "none";
                    }
                    if (this.edit) {
                        this.edit.style.outline = "none";
                    }
                },
                false,
            );
        } else {
            this.edit = document.createElement("div");
            this.edit.textContent = this.definition.text2;
            this.edit.classList.add(Styles.editCenter);
            canvas.appendChild(this.edit);
        }

        this.addHover(canvas);
        this.appendChild(canvas);
    }
}

@customElement("listwindow-toolbar-iconmenu")
export class ToolbarItemIconMenu extends BasicToolbarItem {
    private btn: HTMLButtonElement | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private callback: any;

    constructor(def: ToolbarItem) {
        super(def);
    }

    updateState(state: State): void {
        if (this.btn === undefined) {
            return;
        }
        this.btn.disabled = !state.enabled;
        this.style.display = state.visible ? "block" : "none";
    }

    disconnectedCallback() {
        document.removeEventListener("click", this.callback);
    }

    connectedCallback() {
        const canvas = document.createElement("div");
        canvas.classList.add(Styles.twoGrid);

        const label = document.createElement("div");
        label.textContent = this.definition.text;
        canvas.appendChild(label);

        const dropCanvas = document.createElement("div");
        this.btn = document.createElement("button");
        this.btn.classList.add(Styles.dropdown);
        this.btn.classList.add(Styles.clickable);
        this.btn.classList.add(Styles.focus);
        addVsCodeIcon(this.btn, this.definition.text2, "chevron-down");
        dropCanvas.appendChild(this.btn);

        const dropdown = document.createElement("div");
        // Add the content to the drop-down menu.
        this.definition.stringList.forEach(value => {
            const a = document.createElement("a");
            a.textContent = value;
            a.onclick = _ev => {
                this.dispatchEvent(
                    createCustomEvent("toolbar-item-interaction", {
                        detail: {
                            id: this.definition.id,
                            properties: "",
                        },
                        bubbles: true,
                    }),
                );
            };
            a.classList.add(Styles.dropdownLabel);
            dropdown.appendChild(a);
        });

        dropdown.classList.add(Styles.dropdownContent);

        dropCanvas.appendChild(dropdown);

        this.callback = (ev: MouseEvent) => {
            if (ev.target !== this.btn) {
                if (dropdown.style.display === "block") {
                    dropdown.style.display = "none";
                }
            }
        };
        document.addEventListener("click", this.callback);

        dropCanvas.classList.add(Styles.dropdown);
        canvas.appendChild(dropCanvas);

        this.addHover(canvas);
        this.appendChild(canvas);
    }
}

@customElement("listwindow-toolbar-button")
export class ToolbarItemButton extends BasicToolbarItem {
    private btn: Button | undefined = undefined;

    updateState(state: State): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.btn) {
            this.btn.disabled = !state.enabled;
        }
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    connectedCallback() {
        this.btn = document.createElement("vscode-button") as Button;
        this.btn.id = this.definition.id;

        const addText =
            this.definition.type !== ToolbarItemType.kKindIconButton;
        if (!addText) {
            // Try setting up the image.
            addVsCodeIcon(this.btn, this.definition.text);
            this.btn.setAttribute("appearance", "icon");
            this.btn.classList.add(Styles.imageButton);
        }
        if (addText) {
            this.btn.setAttribute("appearance", "secondary");
            this.btn.textContent = this.definition.text;
            this.btn.classList.add(Styles.textButton);
        }
        this.btn.onclick = () => {
            this.dispatchEvent(
                createCustomEvent("toolbar-item-interaction", {
                    detail: { id: this.definition.id, properties: "" },
                    bubbles: true, // Needs to bubble up to the root DOM.
                }),
            );
        };

        this.addHover(this.btn);
        this.appendChild(this.btn);
    }
}

@customElement("listwindow-toolbar-combo")
export class ToolbarItemCombo extends BasicToolbarItem {
    private select: Dropdown | undefined = undefined;
    enabled = true;

    updateState(state: State): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.select) {
            this.select.disabled = !state.enabled;
        }
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    connectedCallback() {
        // Create the select item.
        this.select = document.createElement("vscode-dropdown") as Dropdown;
        this.select.classList.add(Styles.combo);
        this.select.id = this.definition.id;
        this.definition.stringList.forEach((value: string) => {
            const option = document.createElement("option");
            option.text = value;
            option.value = value;
            this.select?.appendChild(option);

            option.onclick = _ev => {
                // Pack the content.
                const data: TreeData = {
                    key: "TEXT",
                    value: option.text,
                    children: [],
                };
                this.dispatchEvent(
                    createCustomEvent("toolbar-item-interaction", {
                        detail: {
                            id: this.definition.id,
                            properties: packTree(data, true),
                        },
                        bubbles: true,
                    }),
                );
            };
        });

        this.addHover(this.select);
        this.appendChild(this.select);
    }
}

@customElement("listwindow-toolbar-progress")
export class ToolbarItemProgress extends BasicToolbarItem {
    private progressBar: HTMLProgressElement | undefined;

    updateState(state: State): void {
        this.style.display = state.visible ? "block" : "none";
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    connectedCallback() {
        this.progressBar = document.createElement("progress");
        this.progressBar.value = parseInt(this.definition.text);
        this.progressBar.max = parseInt(this.definition.text2);
        this.addHover(this.progressBar);
        this.appendChild(this.progressBar);
    }
}

// Classic checkbox.
@customElement("listwindow-toolbar-simplecheckbox")
export class ToolbarItemSimpleCheckBox extends BasicToolbarItem {
    private checkbox: Checkbox | undefined;

    constructor(def: ToolbarItem) {
        super(def);
    }

    updateState(state: State): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.checkbox) {
            this.checkbox.disabled = !state.enabled;
        }
    }

    connectedCallback() {
        this.checkbox = document.createElement("vscode-checkbox") as Checkbox;
        this.checkbox.onclick = _ev => {
            this.dispatchEvent(
                createCustomEvent("toolbar-item-interaction", {
                    detail: {
                        id: this.definition.id,
                        properties: "",
                    },
                    bubbles: true,
                }),
            );
        };

        this.checkbox.textContent = this.definition.text;
        this.checkbox.classList.add(Styles.simpleCheckbox);
        this.addHover(this.checkbox);
        this.appendChild(this.checkbox);
    }
}

// The checkbox able to take the form of an image or a text.
// This checkbox hides the tickbox, making the image or text
// the state visualizer.
@customElement("listwindow-toolbar-checkbox")
export class ToolbarItemCheckBox extends BasicToolbarItem {
    private checkbox: HTMLInputElement | undefined;
    private label: HTMLLabelElement | undefined;

    private readonly TOGGLE_ON = css({
        background: "var(--vscode-button-background)",
        border: "1px solid var(--vscode-button-foreground)",
        marginTop: "1px",
    });

    private readonly TOGGLE_OFF = css({
        background: "var(--vscode-checkbox-background)",
        border: "1px solid var(--vscode-checkbox-border)",
        marginTop: "2px",
    });

    updateState(state: State): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.checkbox) {
            this.checkbox.disabled = !state.enabled;
        }
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    connectedCallback() {
        this.checkbox = document.createElement("input");
        this.checkbox.type = "checkbox";
        this.checkbox.id = this.definition.id;

        this.checkbox.onclick = _ev => {
            this.dispatchEvent(
                createCustomEvent("toolbar-item-interaction", {
                    detail: {
                        id: this.definition.id,
                        properties: "",
                    },
                    bubbles: true,
                }),
            );

            if (this.label === undefined) {
                return;
            }

            if (this.checkbox?.checked) {
                this.label.classList.remove(this.TOGGLE_OFF);
                this.label.classList.add(this.TOGGLE_ON);
            } else {
                this.label.classList.remove(this.TOGGLE_ON);
                this.label.classList.add(this.TOGGLE_OFF);
            }
        };

        // The trick is to hide the checkbox behind a label
        // that has the look that we want.
        this.label = document.createElement("label");
        this.label.classList.add(Styles.checkboxLabel);
        const addText = this.definition.type !== ToolbarItemType.kKindIconCheck;
        if (!addText) {
            addVsCodeIcon(this.label, this.definition.text, "dashboard");
        }

        if (addText) {
            this.label.textContent = this.definition.text;
        }

        // Connect the label to the checkbox.
        this.label.setAttribute("for", this.definition.id);
        this.addHover(this.label);
        this.label.classList.add(this.TOGGLE_OFF);

        this.checkbox.classList.add(Styles.checkbox);
        this.label.classList.add(Styles.clickable);

        this.appendChild(this.label);
        this.appendChild(this.checkbox);
    }
}

namespace Styles {
    export namespace Constants {
        export const ItemHeight = 19;
        export const Font = css({
            fontSize: "11px",
        });
        export const Background = "var(--vscode-sideBar-background)";
        export const HighLightBackground =
            "var(--vscode-toolbar-hoverBackground)";
    }

    export const imageButton = css({
        height: `${String(Constants.ItemHeight - 1)}px`,
        width: `${String(Constants.ItemHeight - 1)}px !important`,
        color: "var(--vscode-foreground)",
        resize: "none",
        verticalAlign: "middle",
    });

    export const textButton = css({
        height: `${String(Constants.ItemHeight)}px`,
        width: "100% !important",
        minWidth: `${String(Constants.ItemHeight - 1)}px`,
        marginBottom: "3px",
    });

    export const combo = css({
        height: `${String(Constants.ItemHeight)}px`,
        width: "100% !important",
        resize: "none",
        minWidth: "100px",
        marginBottom: "0px",
        zIndex: SharedStyles.ZIndices.ContextMenu,
    });

    export const twoGrid = css({
        display: "flex",
        height: `${String(Constants.ItemHeight)}px`,
        flexWrap: "nowrap",
        justifyContent: "end",
        width: "100%",
        background: Constants.Background,
    });
    export const dropdown = css({
        background: Constants.Background,
        border: "1px solid var(--vscode-sideBar-background)",
        color: "var(--vscode-foreground)",
        display: "block",
        height: `${String(Constants.ItemHeight)}px`,
        objectFit: "fill",
    });
    export const dropdownContent = css({
        background: "var(--vscode-sideBar-background)",
        border: `1px solid ${Constants.HighLightBackground}`,
        display: "none",
        position: "absolute",
        minWidth: "50px",
        marginTop: "4px",
        outline: "1px solid var(--vscode-focusBorder)",
        zIndex: SharedStyles.ZIndices.Toolbar,
    });
    export const dropdownLabel = css(
        {
            display: "block",
            background: "var(--vscode-sideBar-background)",
            minWidth: "50px",
            height: `${String(Constants.ItemHeight)}px`,
            color: "var(--vscode-foreground)",
            padding: "2px 20px",
            fontSize: "11px",
            zIndex: SharedStyles.ZIndices.Toolbar,
        },
        css`
            :hover {
                background: "var(--vscode-sideBar-background)",
                color: ${Constants.HighLightBackground};
                cursor: pointer;
            }
        `,
    );
    export const basicText = css(
        {
            color: "var(--vscode-foreground)",
            background: "var(--vscode-sideBar-background)",
            height: `${String(Constants.ItemHeight - 1)}px`,
            width: "40%",
            padding: "2px 12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            wordBreak: "keep-all",
            textAlign: "right",
            textTransform: "uppercase",
        },
        Constants.Font,
    );
    export const separator = css({
        background: "var(--vscode-sideBar-border)",
        height: `${String(Constants.ItemHeight)}px`,
        width: "2px",
    });
    export const spacing = css({
        background: "var(--vscode-sideBar-background)",
        height: `${String(Constants.ItemHeight)}px`,
        width: "4px",
    });
    export const simpleCheckbox = css({
        height: "16px",
        marginTop: "6px",
    });
    export const checkbox = css({
        display: "none",
        background: "var(--vscode-checkbox-background)",
        color: "var(--vscode-checkbox-foreground)",
        border: "1px solid var(--vscode-checkbox-border)",
        height: `${String(Constants.ItemHeight - 3)}px`,
        width: `${String(Constants.ItemHeight - 3)}px !important`,
        marginTop: "2px",
        borderRadius: "2px",
    });
    export const checkboxLabel = css(
        {
            display: "inline-block",
            background: "var(--vscode-checkbox-background)",
            color: "var(--vscode-checkbox-foreground)",
            border: "1px solid var(--vscode-checkbox-border)",
            textAlign: "center",
            height: `${String(Constants.ItemHeight - 2)}px`,
            width: `${String(Constants.ItemHeight - 2)}px !important`,
            marginTop: "2px",
            borderRadius: "2px",
        },
        Constants.Font,
    );
    export const editableText = css({
        background: "var(--vscode-dropdown-background)",
        color: "var(--vscode-dropdown-foreground)",
        border: "1px solid var(--vscode-dropdown-border)",
        height: `${String(Constants.ItemHeight - 2)}px`,
        borderRadius: "2px",
        marginTop: "1px",
        resize: "none",
    });
    export const editCenter = css(
        {
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            wordBreak: "keep-all",
        },
        editableText,
    );
    export const editLeft = css(
        { textAlign: "left", padding: "0px 12px" },
        editableText,
    );

    export const clickable = css`
        :hover {
            background: var(--vscode-button-secondaryHoverBackground);
            cursor: pointer;
        }
    `;
    export const focus = css`
        :focus {
            background: var(--vscode-list-hoverBackground);
        }
    `;
}
