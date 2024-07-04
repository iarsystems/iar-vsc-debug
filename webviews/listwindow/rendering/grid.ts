/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ColumnResizeMode, RenderParameters } from "../protocol";
import { HeaderElement } from "./header/header";
import { RowElement } from "./row";
import { HoverService } from "./hoverService";
import { createCustomEvent } from "../events";
import { customElement } from "./utils";
import { createCss } from "./styles/createCss";
import { SharedStyles } from "./styles/sharedStyles";
import { CellElement } from "./cell/cell";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
@customElement("listwindow-grid")
export class GridElement extends HTMLElement {
    private static readonly STYLES: CSSStyleSheet[] = [
        createCss({
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
            "td, th": {
                "user-select": "none",
            }
        }),
        HeaderElement.STYLES,
        RowElement.STYLES,
        CellElement.TD_STYLES,
        ...SharedStyles.STYLES,
    ];
    // Styles to apply if ListSpec.showGrid is set
    private static readonly STYLE_GRID_CELL = createCss({
        "th, td": {
            "border-right": "1px solid var(--vscode-widget-border, rgba(0, 0, 0, 0))",
            // This is equivalent to a border-bottom, except it doesn't take up
            // any extra space.
            "box-shadow": "0 1px 0 var(--vscode-widget-border, rgba(0, 0, 0, 0))",
        },
    });
    // Styles to apply if resizeMode is "fit"
    private static readonly STYLE_RESIZEMODE_FIT = createCss({
        ":host, table": {
            width: "100%",
        },
    });

    data?: RenderParameters = undefined;
    initialColumnWidths: number[] | undefined = undefined;
    resizeMode: ColumnResizeMode = "fixed";

    hoverService: HoverService | undefined = undefined;

    private header: HeaderElement | undefined = undefined;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "closed" });
        shadow.adoptedStyleSheets.push(...GridElement.STYLES);

        shadow.adoptedStyleSheets.push(GridElement.STYLE_GRID_CELL);
        GridElement.STYLE_GRID_CELL.disabled = !(this.data?.listSpec.showGrid);
        shadow.adoptedStyleSheets.push(GridElement.STYLE_RESIZEMODE_FIT);
        GridElement.STYLE_RESIZEMODE_FIT.disabled = this.resizeMode !== "fit";

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
            rowElem.hoverService = this.hoverService;
            tbody.appendChild(rowElem);
        }
    }
}
