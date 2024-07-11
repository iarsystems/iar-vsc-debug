/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createCustomEvent } from "../../events";
import { createCss } from "../styles/createCss";
import { SharedStyles } from "../styles/sharedStyles";
import { Theming } from "../styles/theming";
import { customElement } from "../utils";

/**
 * Emitted when the the user presses an expand or collapse button
 */
export type RowExpansionToggledEvent = CustomEvent<RowExpansionToggledEvent.Detail>;
export namespace RowExpansionToggledEvent {
    export interface Detail {
        row: number;
    }
}
/**
 * Emitted when the the user presses a more or less siblings button ("fold" button)
 */
export type MoreLessToggledEvent = CustomEvent<MoreLessToggledEvent.Detail>;
export namespace MoreLessToggledEvent {
    export interface Detail {
        row: number;
    }
}

/**
 * The indentation and possible expand/collapse button shown at the start of
 * the leftmost cells in a listwindow that supports expandable items
 */
@customElement("listwindow-tree-info")
export class TreeInfoElement extends HTMLElement {
    private static readonly BUTTON_SIZE_PX = 16;
    private static readonly BUTTON_PADDING_PX = 2;
    private static readonly INDENT_AMOUNT_PX = 8;
    private static readonly STYLES = createCss({
        ":host": {
            height: "100%",
            "padding-left": "8px",
        },
        "#inner-root": {
            height: "100%",
            display: "flex",
            "align-items": "center",
        },
        "button": {
            cursor: "pointer",
            color: "var(--vscode-icon-foreground)",
            background: "none",
            padding: 0,
            border: "none",
        },
        "#expand-button": {
            padding: `0px ${TreeInfoElement.BUTTON_PADDING_PX}px`,
            width: TreeInfoElement.BUTTON_SIZE_PX + "px",
            height: TreeInfoElement.BUTTON_SIZE_PX + "px",
            "font-size": TreeInfoElement.BUTTON_SIZE_PX + "px",
        },
        "#fold-button": {
            padding: 0,
            width: `${TreeInfoElement.INDENT_AMOUNT_PX}px`,
            height: "100%",
            "font-size": `${TreeInfoElement.INDENT_AMOUNT_PX}px`,
            display: "flex",
            "align-items": "center",
            transform: `translate(${TreeInfoElement.INDENT_AMOUNT_PX / 2}px, 0px)`,
        },
        ".indent-guide": {
            display: "inline-block",
            height: "100%",
            width: `${TreeInfoElement.INDENT_AMOUNT_PX}px`,
            "border-right": `1px solid var(${Theming.Variables.IndentGuideColor})`,
            "box-sizing": "border-box",
        },
    });

    treeinfo = "";
    row = -1;

    connectedCallback() {

        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(TreeInfoElement.STYLES);
        shadow.adoptedStyleSheets.push(...SharedStyles.STYLES);

        const innerRoot = document.createElement("div");
        innerRoot.id = "inner-root";
        shadow.appendChild(innerRoot);

        for (const char of this.treeinfo) {
            if (char === TreeGraphItems.kPlus || char === TreeGraphItems.kMinus) {
                // Row expand/collapse button
                const button = document.createElement("button");
                button.id = "expand-button";
                const iconName = char === TreeGraphItems.kMinus
                    ? "codicon-chevron-down"
                    : "codicon-chevron-right";
                button.classList.add("codicon", iconName);
                button.setAttribute("title", "Expand/collapse row");
                innerRoot.appendChild(button);

                button.onclick = ev => {
                    if (ev.button === 0) {
                        this.dispatchEvent(createCustomEvent("row-expansion-toggled", {
                            detail: { row: this.row },
                            bubbles: true,
                            composed: true,
                        }));
                        // We don't want these clicks to also trigger a cell click
                        ev.stopPropagation();
                    }
                };
            } else if (char === TreeGraphItems.kLeaf) {
                // No expand button for this row, create an equivalent amount of
                // padding to keep things aligned horizontally
                this.style.paddingRight =
                    2 * TreeInfoElement.BUTTON_PADDING_PX +
                    TreeInfoElement.BUTTON_SIZE_PX +
                    "px";
            } else {
                if (char === TreeGraphItems.kMore || char === TreeGraphItems.kLess) {
                    // More/less siblings button (for STL containers)
                    const button = document.createElement("button");
                    button.id = "fold-button";
                    const iconName = char === TreeGraphItems.kMore
                        ? "codicon-fold-down"
                        : "codicon-fold-up";
                    button.classList.add("codicon", iconName);
                    button.setAttribute("title", "Toggle more/less");
                    innerRoot.appendChild(button);

                    button.onclick = ev => {
                        if (ev.button === 0) {
                            this.dispatchEvent(
                                createCustomEvent("more-less-toggled", {
                                    detail: { row: this.row },
                                    bubbles: true,
                                    composed: true,
                                }),
                            );
                            // We don't want these clicks to also trigger a cell click
                            ev.stopPropagation();
                        }
                    };
                } else {
                    // Generic indentation character
                    const indentGuide = document.createElement("div");
                    indentGuide.classList.add("indent-guide");
                    innerRoot.appendChild(indentGuide);
                }
            }
        }
    }
}

// The tree info looks like <indentation><child info><expandability info>
// where
//
// <indentation> is a number of characters equal to the subvariable level - 1,
// so that the children of a top-level struct have 0 characters padding,
// children of a struct within a top-level struct have one char of padding etc.
//
// <child info> For non-top-level items, is a character indicating whether this
// is the last child of its parent ('L') or not ('T') may also be 'v' if more
// siblings can be toggled, or '^' if more siblings have already been toggled.
//
// <expandability info> '+' For not expanded, '-' for expanded, '.' for unexpandable (leaf)

// States constituting a treeinfo, copied from IfxListModel.h
enum TreeGraphItems {
    kLeaf       = ".",
    kPlus       = "+",
    kMinus      = "-",
    kMore       = "v",
    kLess       = "^",
}
