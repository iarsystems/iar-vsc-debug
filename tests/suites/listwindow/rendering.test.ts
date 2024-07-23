/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Vscode from "vscode";
import * as Assert from "assert";
import { testListwindow } from "../../../src/extension";
import { JSDOM } from "jsdom";
import { RenderParameters } from "../../../webviews/listwindow/protocol";
import {
    Alignment,
    Color,
    Format,
    TextStyle,
    Column,
    ListSpec,
    SelRange,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import { queries } from "@testing-library/dom";
import Int64 = require("node-int64");

// For now this serves as a smoke test that we can activate and communicate with
// the view. Later, we might want to start a real debug session and test e.g.
// that the content of the live watch window matches what you would expect.
suite("Listwindow Rendering", () => {
    suiteSetup(async() => {
        const ext = Vscode.extensions.getExtension("iarsystems.iar-debug");
        Assert(ext, "Extension is not installed, did its name change?");
        await ext.activate();
        Assert(testListwindow);
        await testListwindow.show();
        // VS Code may need some time to actually instantiate the view after
        // we've focused it.
        await new Promise(res => setTimeout(res, 2000));
    });

    test("Renders headers", async() => {
        const renderParams = getBaseParameters();
        {
            const document = await renderAndGetDocument(renderParams);
            queries.getByText(document.documentElement, "Column 1");
            queries.getByText(document.documentElement, "Column 2");
        }
    });
});

async function renderAndGetDocument(params: RenderParameters): Promise<Document> {
    Assert(testListwindow, "Has the extension not been activated?");
    await testListwindow!.render(params);
    const html = await testListwindow!.dumpHTML();
    return new JSDOM(html).window.document;
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

function getBaseParameters(): RenderParameters {
    const params: RenderParameters = {
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
        selection: [
            new SelRange({
                first: new Int64(-1),
                last: new Int64(-1),
            }),
        ],
    };

    return params;
}
