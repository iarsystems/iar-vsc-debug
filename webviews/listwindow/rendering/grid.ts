/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css, html, LitElement } from "lit";
import { property, customElement } from "lit/decorators.js";
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
                width: 100%;
                border-spacing: 0px;
            }
            td, th div {
                padding: 4px 12px
            }
        `,
        HeaderElement.STYLES,
        RowElement.STYLES,
        CellElement.STYLES,
        SHARED_STYLES,
    ];

    @property({ type: Object })
    data?: RenderParameters = undefined;

    override render() {
        if (!this.data) {
            // TODO: render some placeholder
            return "";
        }

        let header: HeaderElement | undefined = undefined;
        if (this.data.listSpec.showHeader) {
            header = new HeaderElement();
            header.columns = this.data.columnInfo;
            header.showGrid = this.data.listSpec.showGrid;
        }

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

        function onBackdropClicked(): void {
            // TODO: send selection for row '-1'
            console.log("backdrop clicked");
        }

        return html`
            <div @click=${onBackdropClicked} id="backdrop">
                <table>
                    <thead>
                        ${header}
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }
}
