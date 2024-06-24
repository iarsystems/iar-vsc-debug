/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Cell } from "iar-vsc-common/thrift/bindings/listwindow_types";
import { html, LitElement } from "lit";
import { property, customElement } from "lit/decorators.js";

/**
 * A single cell in a listwindow
 */
@customElement("listwindow-cell")
export class CellElement extends LitElement {

    @property()
    cell?: Cell = undefined;

    override render() {
        return html`<p>${this.cell?.text}</p>`;
    }
}