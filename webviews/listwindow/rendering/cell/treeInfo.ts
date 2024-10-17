/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { Theming } from "../styles/theming";
import { customElement } from "../../../shared/utils";
import { MessageService } from "../../../shared/messageService";

/**
 * Emitted when the the user presses an expand or collapse button
 */
export type RowExpansionToggledEvent = CustomEvent<RowExpansionToggledEvent.Detail>;
export namespace RowExpansionToggledEvent {
    export interface Detail {
        row: bigint;
    }
}
/**
 * Emitted when the the user presses a more or less siblings button ("fold" button)
 */
export type MoreLessToggledEvent = CustomEvent<MoreLessToggledEvent.Detail>;
export namespace MoreLessToggledEvent {
    export interface Detail {
        row: bigint;
    }
}

/**
 * The indentation and possible expand/collapse button shown at the start of
 * the leftmost cells in a listwindow that supports expandable items
 */
@customElement("listwindow-tree-info")
export class TreeInfoElement extends HTMLElement {
    treeinfo = "";
    row = -1n;
    messageService: MessageService | undefined = undefined;

    connectedCallback() {
        this.classList.add(Styles.self);

        // TODO: do we need this?
        const innerRoot = document.createElement("div");
        innerRoot.classList.add(Styles.innerRoot);
        this.appendChild(innerRoot);

        for (const char of this.treeinfo) {
            if (char === TreeGraphItems.kPlus || char === TreeGraphItems.kMinus) {
                // Row expand/collapse button
                const button = document.createElement("button");
                button.classList.add(Styles.button, Styles.expandButton);
                const iconName = char === TreeGraphItems.kMinus
                    ? "codicon-chevron-down"
                    : "codicon-chevron-right";
                button.classList.add("codicon", iconName);
                button.setAttribute("title", "Expand/collapse row");
                innerRoot.appendChild(button);

                button.onclick = ev => {
                    if (ev.button === 0) {
                        this.messageService?.sendMessage({
                            subject: "rowExpansionToggled",
                            row: { value: this.row.toString() },
                        });
                        // Tell the cell to not also trigger a cell click
                        ev.preventDefault();
                    }
                };
            } else if (char === TreeGraphItems.kLeaf) {
                // No expand button for this row, create an equivalent amount of
                // padding to keep things aligned horizontally
                this.style.paddingRight =
                    2 * Styles.buttonPaddingPx + Styles.buttonSizePx + "px";
            } else {
                if (char === TreeGraphItems.kMore || char === TreeGraphItems.kLess) {
                    // More/less siblings button (for STL containers)
                    const button = document.createElement("button");
                    button.classList.add(Styles.button, Styles.foldButton);
                    const iconName = char === TreeGraphItems.kMore
                        ? "codicon-fold-down"
                        : "codicon-fold-up";
                    button.classList.add("codicon", iconName);
                    button.setAttribute("title", "Toggle more/less");
                    innerRoot.appendChild(button);

                    button.onclick = ev => {
                        if (ev.button === 0) {
                            this.messageService?.sendMessage({
                                subject: "moreLessToggled",
                                row: { value: this.row.toString() },
                            });
                            // Tell the cell to not also trigger a cell click
                            ev.preventDefault();
                        }
                    };
                } else {
                    // Generic indentation character
                    const indentGuide = document.createElement("div");
                    indentGuide.classList.add(Styles.indentGuide);
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

namespace Styles {
    export const buttonSizePx = 16;
    export const buttonPaddingPx = 2;
    export const indentAmountPx = 8;

    export const self = css({
        height: "100%",
        paddingLeft: "8px",
    });
    export const innerRoot = css({
        height: "100%",
        display: "flex",
        alignItems: "center",
    });
    export const button = css({
        cursor: "pointer",
        color: "var(--vscode-icon-foreground)",
        background: "none",
        padding: 0,
        border: "none",
    });
    export const expandButton = css({
        padding: `0px ${buttonPaddingPx}px`,
        width: buttonSizePx + "px",
        height: buttonSizePx + "px",
        fontSize: buttonSizePx + "px",
        boxSizing: "content-box",
    });
    export const foldButton = css({
        padding: 0,
        width: `${indentAmountPx}px`,
        height: "100%",
        fontSize: `${indentAmountPx}px !important`,
        display: "flex",
        alignItems: "center",
        transform: `translate(${indentAmountPx / 2}px, 0px)`,
    });
    export const indentGuide = css({
        display: "inline-block",
        height: "100%",
        width: `${indentAmountPx}px`,
        borderRight: `1px solid var(${Theming.Variables.IndentGuideColor})`,
        boxSizing: "border-box",
    });
}