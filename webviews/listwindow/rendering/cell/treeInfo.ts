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
 * The indentation and possible expand/collapse button shown at the start of
 * the leftmost cells in a listwindow that supports expandable items
 */
@customElement("listwindow-tree-info")
export class TreeInfoElement extends HTMLElement {
    private static readonly BUTTON_SIZE_PX = 16;
    private static readonly BUTTON_PADDING_PX = 2;
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
        "#button": {
            padding: `0px ${TreeInfoElement.BUTTON_PADDING_PX}px`,
            width: TreeInfoElement.BUTTON_SIZE_PX + "px",
            height: TreeInfoElement.BUTTON_SIZE_PX + "px",
            cursor: "pointer",
            color: "var(--vscode-icon-foreground)",
        },
        ".indent-guide": {
            display: "inline-block",
            height: "100%",
            width: "8px",
            "border-right": `1px solid var(${Theming.Variables.IndentGuideColor})`,
        },
    });

    treeinfo = "";
    row = -1;

    connectedCallback() {
        const indentationDepth = TreeInfoUtils.getDepth(this.treeinfo);
        if (indentationDepth < 0) {
            // invalid treeinfo, maybe the window doesn't support expandable items?
            return;
        }

        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(TreeInfoElement.STYLES);
        shadow.adoptedStyleSheets.push(...SharedStyles.STYLES);

        const innerRoot = document.createElement("div");
        innerRoot.id = "inner-root";
        shadow.appendChild(innerRoot);

        for (let i = 0; i < indentationDepth; i++) {
            const guide = document.createElement("div");
            guide.classList.add("indent-guide");
            innerRoot.appendChild(guide);
        }

        if (TreeInfoUtils.isExpandable(this.treeinfo)) {
            const button = document.createElement("div");
            button.id = "button";
            const iconName = TreeInfoUtils.isExpanded(this.treeinfo)
                ? "codicon-chevron-down"
                : "codicon-chevron-right";
            button.classList.add("codicon", iconName);
            innerRoot.appendChild(button);

            button.onclick = ev => {
                if (ev.button === 0) {
                    this.dispatchEvent(createCustomEvent("row-expansion-toggled", {
                        detail: { row: this.row },
                        bubbles: true,
                        composed: true,
                    }));
                    // We don't want clicks on the expansion button to also trigger
                    // a cell click
                    ev.stopPropagation();
                }
            };
        } else {
            this.style.paddingRight =
                TreeInfoElement.BUTTON_SIZE_PX +
                2 * TreeInfoElement.BUTTON_PADDING_PX +
                "px";
        }
    }
}

namespace TreeInfoUtils {
    // The tree info looks like <indentation><child info><expandability info>
    // where
    // <indentation> is a number of characters equal to the subvariable level - 1, so that the children of a top-level struct
    // have 0 characters padding, children of a struct within a top-level struct have one char of padding etc.
    // <child info> For non-top-level items, is a character indicating whether this is the last child of its parent ('L') or not ('T')
    // <expandability info> '+' For not expanded, '-' for expanded, '.' for unexpandable (leaf)

    // States constituting a treeinfo, copied from IfxListModel.h
    enum TreeGraphItems {
        kLastChild  = "L",
        kOtherChild = "T",
        kLeaf       = ".",
        kPlus       = "+",
        kMinus      = "-",
    }

    /**
     * How many parents does this row have? Returns -1 on failure
     */
    export function getDepth(treeinfo: string): number {
        return treeinfo.search(new RegExp(`[${TreeGraphItems.kLeaf}${TreeGraphItems.kPlus}\\${TreeGraphItems.kMinus}]`));
    }

    export function isExpandable(treeinfo: string) {
        return treeinfo.endsWith(TreeGraphItems.kMinus) || treeinfo.endsWith(TreeGraphItems.kPlus);
    }
    export function isExpanded(treeinfo: string) {
        return treeinfo.endsWith(TreeGraphItems.kMinus);
    }
}