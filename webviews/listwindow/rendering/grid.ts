/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ColumnResizeMode, RenderParameters } from "../protocol";
import { HeaderElement } from "./header";
import { RowElement } from "./row";
import { CellElement } from "./cell";
import { Styles } from "./styles";
import { customElement } from "./utils";
import { createCustomEvent } from "../events";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
@customElement("listwindow-grid")
export class GridElement extends HTMLElement {
    private static readonly STYLES: Styles.StyleRules[] = [
        {
            "#backdrop": {
                width: "100%",
                height: "100%",
                // Always add some space below the table that we can press to
                // deselect everything
                // "padding-bottom": "1em",
            },
            table: {
                "border-spacing": "0px",
                "table-layout": "fixed",
            },
            // The header should be fixed at the top, regardless of scroll position
            thead: {
                position: "sticky",
                top: 0,
                background: "var(--vscode-sideBar-background)",
            },
            "td, th div": {
                padding: "4px 12px",
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "user-select": "none",
            }
        },
        HeaderElement.STYLES,
        RowElement.STYLES,
        CellElement.STYLES,
        ...Styles.SHARED_STYLES,
    ];
    // Styles to apply if ListSpec.showGrid is set
    private static readonly STYLE_GRID_CELL: Styles.StyleRules = {
        "th, td": {
            "border-right": "1px solid var(--vscode-widget-border, rgba(0, 0, 0, 0))",
            "border-bottom": "1px solid var(--vscode-widget-border, rgba(0, 0, 0, 0))",
        },
    };
    // Styles to apply if resizeMode is "fit"
    private static readonly STYLE_RESIZEMODE_FIT: Styles.StyleRules = {
        ":host, table": {
            width: "100%",
        },
    };

    data?: RenderParameters = undefined;
    initialColumnWidths: number[] | undefined = undefined;
    resizeMode: ColumnResizeMode = "fixed";

    private header: HeaderElement | undefined = undefined;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(Styles.toCss(GridElement.STYLES));
        if (this.data?.listSpec.showGrid) {
            shadow.adoptedStyleSheets.push(
                Styles.toCss(GridElement.STYLE_GRID_CELL),
            );
        }
        if (this.resizeMode === "fit") {
            shadow.adoptedStyleSheets.push(
                Styles.toCss(GridElement.STYLE_RESIZEMODE_FIT),
            );
        }

        if (!this.data) {
            // TODO: render some placeholder
            return;
        }

        if (this.initialColumnWidths === undefined) {
            this.initialColumnWidths = this.data.columnInfo.map(col => col.width);
        }

        const backdrop = document.createElement("div");
        backdrop.id = "backdrop";
        backdrop.onclick = (ev: MouseEvent) => {
            if (ev.target === this.shadowRoot?.querySelector("#backdrop")) {
                this.dispatchEvent(
                    createCustomEvent("cell-clicked", {
                        detail: {
                            col: -1,
                            row: -1,
                            isDoubleClick: ev.detail === 2,
                            ctrlPressed: false,
                            shiftPressed: false,
                        },
                        bubbles: true,
                        composed: true,
                    }),
                );
            }
        };
        shadow.appendChild(backdrop);

        const table = document.createElement("table");
        if (document.hasFocus()) {
            table.classList.add(Styles.CLASS_VIEW_FOCUSED);
        }
        window.addEventListener("focus", () => {
            table.classList.add(Styles.CLASS_VIEW_FOCUSED);
        });
        window.addEventListener("blur", () => {
            table.classList.remove(Styles.CLASS_VIEW_FOCUSED);
        });
        backdrop.appendChild(table);

        // Create header
        if (this.data.listSpec.showHeader) {
            this.header = new HeaderElement();
            this.header.columns = this.data.columnInfo;
            this.header.initialColumnWidths = this.initialColumnWidths;
            this.header.clickable = this.data.listSpec.canClickColumns;
            this.header.resizeMode = this.resizeMode;

            const thead = document.createElement("thead");
            thead.appendChild(this.header);
            table.appendChild(thead);
        }

        // Create body
        const tbody = document.createElement("tbody");
        table.appendChild(tbody);
        for (const [y, row] of this.data.rows.entries()) {
            const rowElem = new RowElement();
            rowElem.row = row;
            rowElem.index = y;
            // TODO: fix
            rowElem.selected =
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.data.selection.first.buffer.data[7]! <= y &&
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.data.selection.last.buffer.data[7]! >= y;
            tbody.appendChild(rowElem);
        }
    }
}
