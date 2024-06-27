/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css, html, LitElement } from "lit";
import { property, customElement, state } from "lit/decorators.js";
import { RenderParameters } from "../protocol";
import { HeaderElement } from "./header";
import { RowElement } from "./row";
import { CellElement } from "./cell";
import { SHARED_STYLES } from "./sharedStyles";

/**
 * A full listwindow grid, including headers but excluding any toolbar
 */
@customElement("listwindow-grid")
export class GridElement extends LitElement {
    static override styles = [
        css`
            #backdrop {
                width: 100%;
                height: 100%;
                // Always add some space below the table that we can press to
                // deselect everything
                padding-bottom: 1em;
            }
            table {
                // width: 100%;
                border-spacing: 0px;
            }
            td,
            th div {
                padding: 4px 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                user-select: none;
            }
        `,
        HeaderElement.STYLES,
        RowElement.STYLES,
        CellElement.STYLES,
        SHARED_STYLES,
    ];

    @property({ type: Object })
    data?: RenderParameters = undefined;

    @state()
    private header: HeaderElement | undefined = undefined;
    @property({ type: Array })
    private initialColumnWidths: number[] | undefined = undefined;

    override render() {
        if (!this.data) {
            // TODO: render some placeholder
            return "";
        }
        if (this.initialColumnWidths === undefined) {
            this.initialColumnWidths = this.data.columnInfo.map(col => col.width);
        }

        // Create header
        if (this.data.listSpec.showHeader) {
            this.header = new HeaderElement();
            this.header.columns = this.data.columnInfo;
            this.header.columnWidths = this.initialColumnWidths;
            this.header.showGrid = this.data.listSpec.showGrid;
            this.header.clickable = this.data.listSpec.canClickColumns;
        }

        // Create body
        const rows: HTMLElement[] = [];
        for (const [i, row] of this.data.rows.entries()) {
            const rowElem = new RowElement();
            rowElem.row = row;
            // TODO: fix
            rowElem.selected =
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.data.selection.first.buffer.data[7]! <= i &&
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.data.selection.last.buffer.data[7]! >= i;
            rowElem.showGrid = this.data.listSpec.showGrid;
            rows.push(rowElem);
        }

        const onBackdropClicked = (ev: MouseEvent) => {
            if (ev.target === this.shadowRoot?.querySelector("#backdrop")) {
                // TODO: send selection for row '-1'
                console.log("backdrop clicked");
            }
        };
        console.log(this.shadowRoot?.querySelector("table"));

        return html`
            <div @click=${onBackdropClicked} id="backdrop">
                <table>
                    <thead>
                        ${this.header}
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }
}
