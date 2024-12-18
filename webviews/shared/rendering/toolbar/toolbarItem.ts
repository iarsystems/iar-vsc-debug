/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { customElement, toBigInt } from "../../utils";
import { Tags, ToolbarItem, ToolbarItemType } from "./toolbarConstants";
import { createCustomEvent } from "../../events";
import { Checkbox } from "@vscode/webview-ui-toolkit/dist/checkbox";
import { Button } from "@vscode/webview-ui-toolkit/dist/button";
import { Dropdown } from "@vscode/webview-ui-toolkit/dist/dropdown";
import { SharedStyles } from "../../../listwindow/rendering/styles/sharedStyles";
import { HoverService } from "../../../listwindow/rendering/hoverService";
import { ExtensionMessage, Serializable } from "../../protocol";
import { ToolbarItemState } from "../../thrift/listwindow_types";
import { IconMap } from "../../../listwindow/rendering/icons";
import { PropertyTreeItem } from "../../thrift/shared_types";

export type ToolbarItemEvent = CustomEvent<ToolbarItemEvent.Detail>;
export namespace ToolbarItemEvent {
    export interface Detail {
        id: string;
        properties: Serializable<PropertyTreeItem>;
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
    const iconSpec = IconMap.get(iconId);
    if (iconSpec !== undefined) {
        element.classList.add("codicon", `codicon-${iconSpec[0]}`);
        if (iconSpec[1] !== undefined) {
            element.style.color = iconSpec[1] as string;
        }
    } else {
        element.classList.add("codicon", `codicon-${defaultImage}`);
    }
}

export abstract class BasicToolbarItem extends HTMLElement {
    protected readonly definition: ToolbarItem;
    public hoverService: HoverService | undefined = undefined;
    protected currentState: Serializable<ToolbarItemState> | undefined =
        undefined;

    // Implemented by subclass
    abstract updateState(state: Serializable<ToolbarItemState>): void;
    abstract updateState(state: Serializable<ToolbarItemState>): void;

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

    public handleMessage(msg: ExtensionMessage) {
        if (msg.subject === "updateToolbarItem") {
            if (this.definition.id !== msg.id) {
                return;
            }

            switch (msg.type) {
                case "freeze": {
                    const frozenState = msg.state;
                    if (this.currentState) {
                        frozenState.detail = this.currentState.detail;
                        frozenState.on = this.currentState.on;
                        frozenState.str = this.currentState.str;
                        frozenState.visible = this.currentState.visible;
                    }
                    frozenState.enabled = false;
                    this.updateState(frozenState);
                    break;
                }
                case "normal": {
                    this.currentState = msg.state;
                    this.updateState(msg.state);
                    break;
                }
                case "thaw": {
                    this.updateState(this.currentState ?? msg.state);
                    break;
                }
            }
        }
    }

    public packContent(
        final: boolean,
        content: string,
    ): Serializable<PropertyTreeItem> {
        return this.packContentWithInt(final ? 1 : 0, content);
    }

    public packContentWithInt(
        int: number,
        content: string,
    ): Serializable<PropertyTreeItem> {
        return {
            key: "ROOT",
            value: "NONE",
            children: [
                { key: "int0", value: int.toString(), children: [] },
                { key: "str0", value: content, children: [] },
            ],
        };
    }

    public packForForm(): Serializable<PropertyTreeItem> {
        return {
            key: "ID",
            value: this.definition.id,
            children: [
                { key: "int0", value: "1", children: [] },
                { key: "str0", value: this.getValue() ?? "", children: [] },
            ],
        };
    }

    // Get the current value of the item.
    getValue(): string | undefined {
        return undefined;
    }
    // Get the current enabled state of the item.
    getState(): boolean | undefined {
        return undefined;
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

    updateState(_state: Serializable<ToolbarItemState>): void {
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
    private readonly historyElements: HTMLAnchorElement[] = [];
    private readonly align: string | undefined;

    constructor(
        def: ToolbarItem,
        isEditable = false,
        align: string | undefined = undefined,
    ) {
        super(def);
        this.editable = isEditable;
        this.align = align;
    }

    updateState(state: Serializable<ToolbarItemState>): void {
        if (this.edit === undefined) {
            return;
        }
        this.edit.style.display = state.visible ? "block" : "none";
        if (this.editable && this.edit instanceof HTMLInputElement) {
            if (state.enabled) {
                this.edit.removeAttribute("disabled");
                this.edit.style.background =
                    "var(--vscode-dropdown-background)";
                this.edit.style.color = "var(--vscode-dropdown-foreground)";
            } else {
                this.edit.style.color =
                    "var(--vscode-radio-inactiveForeground)";
                this.edit.style.background = "var(--vscode-radio-background)";
                this.edit.setAttribute("disabled", "true");
            }
        }
        this.edit.textContent = state.str;

        let history = state.str.split("\t");
        // Drop overflowing history.
        if (history.length > this.NO_HISTORY_ELEMS) {
            history = history.slice(this.NO_HISTORY_ELEMS - 1);
        }

        for (let i = 0; i < this.NO_HISTORY_ELEMS; i++) {
            let content: string | undefined = "";
            if (i < history.length) {
                content = history[i];
            }
            const hElement = this.historyElements[i];
            if (hElement) {
                hElement.textContent = content as string;
            }
        }
    }

    override getValue(): string | undefined {
        if (this.edit && this.edit instanceof HTMLInputElement) {
            return this.edit.value;
        } else {
            return undefined;
        }
    }

    override getState(): boolean | undefined {
        return this.edit?.contentEditable === "true";
    }

    connectedCallback() {
        const canvas = document.createElement("div");

        if (this.definition.text.length > 0) {
            canvas.classList.add(Styles.twoGrid);
            const label = document.createElement("div");
            label.textContent = this.definition.text;
            label.classList.add(Styles.basicText);
            if (this.align) {
                canvas.style.justifyContent = this.align;
                label.style.width = "40px";
            }
            canvas.appendChild(label);
        } else {
            canvas.classList.add(Styles.oneGrid);
        }

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

                    this.dispatchEvent(
                        createCustomEvent("toolbar-item-interaction", {
                            detail: {
                                id: this.definition.id,
                                properties: this.packContent(true, content),
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

            if (!this.align) {
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
                                    properties: this.packContent(
                                        true,
                                        this.edit.value,
                                    ),
                                },
                                bubbles: true,
                            }),
                        );
                    };
                    element.classList.add(Styles.dropdownLabel);

                    this.historyElements.push(element);
                    this.historyCanvas.appendChild(element);
                }

                this.historyCanvas.classList.add(Styles.dropdownContent);
                editCanvas.appendChild(this.historyCanvas);
            }

            this.edit.onfocus = _ev => {
                if (this.historyCanvas !== undefined) {
                    this.historyCanvas.style.display = "block";
                }
                if (this.edit) {
                    this.edit.style.outline = `1px solid var(--vscode-focusBorder)`;
                }
            };
            this.edit.onblur = () => {
                if (
                    this.edit === undefined ||
                    !(this.edit instanceof HTMLInputElement)
                ) {
                    return;
                }
                this.dispatchEvent(
                    createCustomEvent("toolbar-item-interaction", {
                        detail: {
                            id: this.definition.id,
                            properties: this.packContent(
                                false,
                                this.edit.value,
                            ),
                        },
                        bubbles: true,
                    }),
                );
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

            canvas.appendChild(editCanvas);
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

    updateState(state: Serializable<ToolbarItemState>): void {
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
                            properties: this.packContent(true, value),
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

    updateState(state: Serializable<ToolbarItemState>): void {
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
                    detail: {
                        id: this.definition.id,
                        properties: {
                            key: "ROOT",
                            value: "NONE",
                            children: [],
                        },
                    },
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

    updateState(state: Serializable<ToolbarItemState>): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.select) {
            this.select.disabled = !state.enabled;
            this.select.selectedIndex = Number(toBigInt(state.detail));
        }
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    override getValue(): string | undefined {
        return this.select?.value as string;
    }

    override getState(): boolean | undefined {
        return !this.select?.disabled;
    }

    connectedCallback() {
        // Create the select item.
        this.select = document.createElement("vscode-dropdown") as Dropdown;
        this.select.classList.add(Styles.combo);
        this.select.id = this.definition.id;
        this.definition.stringList.forEach((value: string, index) => {
            const option = document.createElement("option");
            option.text = value;
            option.value = value;
            this.select?.appendChild(option);

            option.onclick = _ev => {
                this.dispatchEvent(
                    createCustomEvent("toolbar-item-interaction", {
                        detail: {
                            id: this.definition.id,
                            properties: this.packContentWithInt(
                                index,
                                option.text,
                            ),
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

    updateState(state: Serializable<ToolbarItemState>): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.progressBar) {
            this.progressBar.value = Number(toBigInt(state.detail));
        }
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    connectedCallback() {
        this.progressBar = document.createElement("progress");
        // It seems all windows use 10000 as max by convention.
        this.progressBar.max = 10000;
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

    updateState(state: Serializable<ToolbarItemState>): void {
        this.style.display = state.visible ? "block" : "none";
        if (this.checkbox) {
            this.checkbox.disabled = !state.enabled;
            this.checkbox.checked = state.on;
        }
    }

    override getValue(): string {
        if (this.checkbox) {
            return this.checkbox.checked ? Tags.kValTrue : Tags.kValFalse;
        }
        return Tags.kValFalse;
    }

    override getState(): boolean | undefined {
        return !this.checkbox?.disabled;
    }

    connectedCallback() {
        this.checkbox = document.createElement("vscode-checkbox") as Checkbox;
        this.checkbox.onclick = _ev => {
            this.dispatchEvent(
                createCustomEvent("toolbar-item-interaction", {
                    detail: {
                        id: this.definition.id,
                        properties: this.packContent(
                            true,
                            // Flip this checked, as the actual check occures after.
                            this.checkbox?.checked
                                ? Tags.kValFalse
                                : Tags.kValTrue,
                        ),
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
    private label: HTMLElement | undefined;
    private checked = false;
    private enabled = true;

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

    updateState(state: Serializable<ToolbarItemState>): void {
        this.style.display = state.visible ? "block" : "none";
        this.checked = state.on;
        this.enabled = state.enabled;
        this.updateCheckbox();
    }

    constructor(def: ToolbarItem) {
        super(def);
    }

    updateCheckbox() {
        if (this.label) {
            if (this.checked) {
                this.label.classList.remove(this.TOGGLE_OFF);
                this.label.classList.add(this.TOGGLE_ON);
            } else {
                this.label.classList.remove(this.TOGGLE_ON);
                this.label.classList.add(this.TOGGLE_OFF);
            }

            if (this.enabled) {
                this.label.classList.add(Styles.clickable);
            } else {
                this.label.classList.remove(Styles.clickable);
            }
        }
    }

    override getValue(): string {
        return this.checked ? Tags.kValTrue : Tags.kValFalse;
    }

    connectedCallback() {
        this.onclick = _ev => {
            if (!this.enabled) {
                return;
            }

            this.dispatchEvent(
                createCustomEvent("toolbar-item-interaction", {
                    detail: {
                        id: this.definition.id,
                        properties: this.packContent(
                            true,
                            this.checked ? Tags.kValFalse : Tags.kValTrue,
                        ),
                    },
                    bubbles: true,
                }),
            );

            if (this.label === undefined) {
                return;
            }

            this.updateCheckbox();
        };

        // The trick is to hide the checkbox behind a label
        // that has the look that we want.
        this.label = document.createElement("div");
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

        this.label.classList.add(Styles.clickable);

        this.appendChild(this.label);
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
        width: "98% !important",
        resize: "none",
        minWidth: "100px",
        marginBottom: "0px",
        zIndex: SharedStyles.ZIndices.ContextMenu,
    });

    export const oneGrid = css({
        display: "block",
        height: `${String(Constants.ItemHeight)}px`,
        flexWrap: "nowrap",
        justifyContent: "start",
        width: "100%",
        background: "inherit",
    });
    export const twoGrid = css({
        display: "flex",
        height: `${String(Constants.ItemHeight)}px`,
        flexWrap: "nowrap",
        justifyContent: "end",
        width: "100%",
        background: "inherit",
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
            background: "inherit",
            height: `${String(Constants.ItemHeight - 1)}px`,
            width: "auto",
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
        width: "92%",
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
        { textAlign: "left", paddingLeft: "4%" },
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
