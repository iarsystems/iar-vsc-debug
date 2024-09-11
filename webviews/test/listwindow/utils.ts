/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    Alignment,
    Color,
    Format,
    TextStyle,
    Column,
    ListSpec,
    SelRange,
    Row,
    Cell,
    Target,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import { RenderParameters } from "../../listwindow/protocol";
import Int64 = require("node-int64");
import { MockVSCodeApi } from "./testEnvironment";
import { waitFor } from "@testing-library/dom";
import * as Assert from "assert";

export namespace TestUtils {
    /**
     * Sends the given parameters and waits for the view to finish rendering them
     */
    export function render(api: MockVSCodeApi, params: RenderParameters) {
        api.postMessage({ subject: "render", params });
        return api.waitForMessage("rendered");
    }

    export function renderToolbar(api: MockVSCodeApi, params: string) {
        api.postMessage({ subject: "renderToolbar", params });
        return api.waitForMessage("toolbarRendered");
    }

    const black = new Color({
        r: 0,
        g: 0,
        b: 0,
        isDefault: true,
        lowContrast: false,
    });
    const format = new Format({
        align: Alignment.kLeft,
        barColor: black,
        bgColor: black,
        editable: true,
        icons: [],
        style: TextStyle.kProportionalPlain,
        textColor: black,
        transp: black,
    });

    /**
     * Waits for an element matching the given selector to be added to the container
     */
    export function findBySelector(container: HTMLElement, selector: string): Promise<Element> {
        return waitFor(
            () => {
                const elem = container.querySelector(selector);
                Assert(elem);
                return elem;
            },
            { container },
        );
    }

    export function generateRenderParameters(numRows = 0): RenderParameters {
        const params: RenderParameters = {
            frozen: false,
            rows: [],
            columnInfo: [
                new Column({
                    title: "Column 1",
                    width: 100,
                    fixed: false,
                    hideSelection: false,
                    defaultFormat: format,
                }),
                new Column({
                    title: "Column 2",
                    width: 150,
                    fixed: false,
                    hideSelection: false,
                    defaultFormat: format,
                }),
            ],
            listSpec: new ListSpec({
                bgColor: black,
                canClickColumns: true,
                showCheckBoxes: false,
                showGrid: true,
                showHeader: true,
            }),
            selection: [new SelRange({
                first: new Int64(-1),
                last: new Int64(-1),
            })],
        };
        params.rows = generateRows(numRows);

        return params;
    }

    function generateRows(numRows: number): Row[] {
        const rows: Row[] = [];

        for (let row = 0; row < numRows; row++) {
            rows.push(new Row({
                cells: [
                    new Cell({
                        drop: Target.kNoTarget,
                        format,
                        text: `Cell 0-${row}`
                    }),
                    new Cell({
                        drop: Target.kNoTarget,
                        format,
                        text: `Cell 1-${row}`
                    }),
                ],
                isChecked: false,
                treeinfo: ".",
            }));
        }

        return rows;
    }

}