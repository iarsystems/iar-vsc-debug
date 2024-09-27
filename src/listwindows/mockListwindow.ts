/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import {
    ViewMessage,
    RenderParameters,
    Serializable,
} from "../../webviews/listwindow/protocol";
import {
    Alignment,
    Cell,
    Color,
    Column,
    Format,
    ListSpec,
    Row,
    SelRange,
    Target,
    TextStyle,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import Int64 = require("node-int64");
import { EditInfo, MenuItem, SelectionFlags } from "../../webviews/listwindow/thrift/listwindow_types";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { PropertyTreeItem } from "../../webviews/listwindow/thrift/shared_types";

/**
 * A listwindow that renders mock data and is able to fake some user interaction.
 * This is meant as a playground for development purposes.
 */
export class MockListwindow implements vscode.Disposable {
    private static readonly VIEW_ID = "iar-mock-listwindow";

    private readonly view: ListwindowViewProvider;

    /**
     * Creates a new view and registers it.
     */
    constructor(extensionUri: vscode.Uri) {
        this.view = new ListwindowViewProvider(
            extensionUri,
            MockListwindow.VIEW_ID,
        );
        this.view.setEnabled(true);
        this.view.onMessageReceived = (msg) => this.handleMessageFromView(msg);
    }

    dispose() {
        this.view.dispose();
    }

    private handleMessageFromView(msg: ViewMessage) {
        switch (msg.subject) {
            case "loaded":
                this.view.postMessageToView({
                    subject: "render",
                    params: getMockRenderParams(),
                });
                this.view.postMessageToView({
                    subject: "renderToolbar",
                    params: toolbar,
                });
                break;
            case "rendered":
                break;
            case "viewportChanged":
                break;
            case "HTMLDump":
                break;
            case "columnClicked":
                break;
            case "cellLeftClicked":
                this.view.postMessageToView({
                    subject: "render",
                    params: getMockRenderParams(
                        Number(msg.row.value),
                        msg.flags === SelectionFlags.kAdd
                            ? Number(msg.row.value) + 2
                            : Number(msg.row.value),
                    ),
                });
                break;
            case "cellDoubleClicked":
                break;
            case "getContextMenu":
                this.view.postMessageToView({
                    subject: "contextMenuReply",
                    menu: [
                        new MenuItem({
                            text: "Remove",
                            command: 1,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Live Watch",
                            command: 2,
                            enabled: true,
                            checked: true,
                        }),
                        new MenuItem({
                            text: "",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Default Format",
                            command: -1,
                            enabled: false,
                            checked: true,
                        }),
                        new MenuItem({
                            text: "Binary Format",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: ">Show As...",
                            command: 0,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "As Is",
                            command: 3,
                            enabled: true,
                            checked: true,
                        }),
                        new MenuItem({
                            text: "float",
                            command: 4,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: ">Other...",
                            command: 0,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Pointer",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "<",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "<",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: ">Disabled submenu",
                            command: -1,
                            enabled: false,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "Submenu item",
                            command: 5,
                            enabled: true,
                            checked: false,
                        }),
                        new MenuItem({
                            text: "<",
                            command: 6,
                            enabled: true,
                            checked: false,
                        }),
                    ],
                });
                break;
            case "contextItemClicked":
                break;
            case "getTooltip":
                {
                    const text = msg.col !== 2 ? `BASEPRI_MAX
    ReadWrite
    bits [15:8]
    Base priority mask raise
    Right-click for more registers and options` : undefined;
                    this.view.postMessageToView({
                        subject: "tooltipReply",
                        text,
                    });
                }
                break;
            case "rowExpansionToggled":
                break;
            case "moreLessToggled":
                break;
            case "checkboxToggled":
                break;
            case "getEditableString":
                if (msg.col === -1) {
                    msg.col = 0;
                }
                this.view.postMessageToView({
                    subject: "editableStringReply",
                    info: new EditInfo({
                        editString: "Hello Edit",
                        column: 0,
                        range: new SelRange({
                            first: new Int64(0),
                            last: new Int64(-1),
                        }),
                    }),
                    col: msg.col,
                    row: msg.row,
                });
                break;
            case "cellEdited":
                break;
            case "localDrop":
                break;
            case "externalDrop":
                break;
            case "keyNavigationPressed":
                break;
            case "absoluteScrolled":
                break;
            case "scrollOperationPressed":
                break;
            case "toolbarItemInteraction":
                console.log(
                    `Interaction with item ${msg.id} with data ${msg.properties}`,
                );
                break;
            case "getToolbarToolTip": {
                const text = `Tooltip for item ${msg.id}`;
                this.view.postMessageToView({
                    subject: "tooltipReply",
                    text,
                });
                break;
            }
            case "toolbarRendered":
                break;
            case "keyPressed":
                break;
            default: {
                // Makes TS check that all message variants are handled
                const _exhaustiveCheck: never = msg;
                throw new Error(
                    "Unhandled message: " +
                        JSON.stringify(_exhaustiveCheck),
                );
            }
        }
    }
}

function getMockRenderParams(selectionStart = 1, selectionEnd = selectionStart) {
    const black = new Color({ r: 0, b: 0, g: 0, isDefault: true, lowContrast: false });
    const grey = new Color({ r: 180, b: 180, g: 180, isDefault: true, lowContrast: false });
    const white = new Color({ r: 255, b: 255, g: 255, isDefault: true, lowContrast: false });
    const red = new Color({ r: 255, b: 0, g: 0, isDefault: true, lowContrast: false });

    const format = new Format();
    format.align = Alignment.kLeft;
    format.style = TextStyle.kProportionalPlain;
    format.bgColor = black;
    format.textColor = grey;
    format.icons = [];
    const editableFormat = new Format();
    editableFormat.align = Alignment.kLeft;
    editableFormat.style = TextStyle.kProportionalPlain;
    editableFormat.editable = true;
    editableFormat.bgColor = black;
    editableFormat.textColor = white;
    editableFormat.icons = ["IDE_PERSIST_EXPR_VAL"];
    const memFormat = new Format();
    memFormat.align = Alignment.kRight;
    memFormat.style = TextStyle.kFixedItalic;
    memFormat.bgColor = black;
    memFormat.textColor = red;
    memFormat.icons = [];

    const params: RenderParameters = {
        rows: [
            new Row({
                cells: [
                    new Cell({
                        text: "Fib",
                        format: editableFormat,
                        drop: Target.kTargetRow,
                    }),
                    new Cell({
                        text: "<array>",
                        format,
                        drop: Target.kTargetRow,
                    }),
                    new Cell({
                        text: "0x2000'0030",
                        format: memFormat,
                        drop: Target.kTargetRow,
                    }),
                    new Cell({
                        text: "uint32_t[10]",
                        format,
                        drop: Target.kTargetRow,
                    }),
                ],
                isChecked: true,
                treeinfo: "-",
            }),
        ],
        columnInfo: [
            new Column({
                title: "Expression",
                width: 100,
                fixed: false,
                hideSelection: false,
                defaultFormat: editableFormat,
            }),
            new Column({
                title: "Value",
                width: 150,
                fixed: false,
                hideSelection: false,
                defaultFormat: editableFormat,
            }),
            new Column({
                title: "Location",
                width: 100,
                fixed: false,
                hideSelection: false,
                defaultFormat: memFormat,
            }),
            new Column({
                title: "Type",
                width: 150,
                fixed: false,
                hideSelection: false,
                defaultFormat: format,
            }),
        ],
        listSpec: new ListSpec(),
        selection: [],
        frozen: false,
        offset: { value: "0" },
        scrollInfo: {
            fractionBefore: 0.0,
            fractionInWin: 1.0,
            fractionAfter: 0.0,
        }
    };
    params.listSpec.showHeader = true;
    params.listSpec.showGrid = true;
    params.listSpec.showCheckBoxes = true;
    params.listSpec.canClickColumns = true;
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        params.rows.push(new Row({
            cells: [
                new Cell({ text: `[${i}]`, format, drop: Target.kTargetRow}),
                new Cell({ text: String(i), format: editableFormat, drop: Target.kTargetRow}),
                new Cell({ text: "0x2000'0030", format: memFormat, drop: Target.kTargetRow}),
                new Cell({ text: "uint32_t", format, drop: Target.kTargetColumn}),
            ],
            isChecked: false,
            treeinfo: "T.",
        }));
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.rows[4]!.treeinfo = "^.";
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params.rows[params.rows.length - 1]!.treeinfo = "v+";
    params.rows.push(
        new Row({
            cells: [
                new Cell({
                    text: "<click to add>",
                    format: editableFormat,
                    drop: Target.kTargetCell,
                }),
                new Cell({
                    text: "",
                    format,
                    drop: Target.kTargetRow,
                }),
                new Cell({
                    text: "",
                    format,
                    drop: Target.kTargetRow,
                }),
                new Cell({
                    text: "",
                    format,
                    drop: Target.kNoTarget,
                }),
            ],
            isChecked: false,
            treeinfo: "."
        }),
    );
    params.selection.push(new SelRange({
        first: new Int64(selectionStart),
        last: new Int64(selectionEnd),
    }));
    return params;
}

const toolbar: Serializable<PropertyTreeItem> = {
    key: "ROOT",
    value: "NONE",
    children: [
        {
            key: "ITEM0",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "first",
                    children: [],
                },
                {
                    key: "ID",
                    value: "100",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "TEXTBUTTON",
                    children: [],
                },
                {
                    key: "STRINGLIST",
                    value: "LIST",
                    children: [
                        { key: "0", value: "first", children: [] },
                        {
                            key: "1",
                            value: "Huppladuffing",
                            children: [],
                        },
                    ],
                },
            ],
        },
        {
            key: "ITEM1",
            value: "NONE",
            children: [
                { key: "TEXT", value: "Huppladuffing", children: [] },
                {
                    key: "ID",
                    value: "300",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "TEXTBUTTON",
                    children: [],
                },
                {
                    key: "STRINGLIST",
                    value: "LIST",
                    children: [
                        { key: "0", value: "first", children: [] },
                        {
                            key: "1",
                            value: "Huppladuffing",
                            children: [],
                        },
                    ],
                },
            ],
        },
        {
            key: "ITEM2",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "MORE",
                    children: [],
                },
                {
                    key: "ID",
                    value: "-1",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "SPACING",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM3",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "IDI_DBU_TRACE_CLEAR",
                    children: [],
                },
                {
                    key: "ID",
                    value: "200",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "ICONBUTTON",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM4",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "LESS",
                    children: [],
                },
                {
                    key: "ID",
                    value: "-1",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "SPACING",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM5",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "IDI_DBU_TRACE_BROWSE",
                    children: [],
                },
                {
                    key: "ID",
                    value: "400",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "ICONBUTTON",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM6",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "Check",
                    children: [],
                },
                {
                    key: "ID",
                    value: "500",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "TEXTCHECK",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM7",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "IDI_DBU_TRACE_ONOFF",
                    children: [],
                },
                {
                    key: "ID",
                    value: "600",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "ICONCHECK",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM8",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "MC",
                    children: [],
                },
                {
                    key: "ID",
                    value: "700",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "SELECTMENU",
                    children: [],
                },
                {
                    key: "STRINGLIST",
                    value: "LIST",
                    children: [
                        {
                            key: "0",
                            value: "Alfa",
                            children: [],
                        },
                        {
                            key: "1",
                            value: "Beta",
                            children: [],
                        },
                        {
                            key: "2",
                            value: "Gamma",
                            children: [],
                        },
                    ],
                },
            ],
        },
        {
            key: "ITEM9",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "Display:",
                    children: [],
                },
                {
                    key: "ID",
                    value: "800",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "DISPLAYTEXT",
                    children: [],
                },
                {
                    key: "TEXT2",
                    value: "Samla mammas manna",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM10",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "Hmm...",
                    children: [],
                },
                {
                    key: "ID",
                    value: "900",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "ICONMENU",
                    children: [],
                },
            ],
        },
        {
            key: "ITEM11",
            value: "NONE",
            children: [
                {
                    key: "TEXT",
                    value: "Editlabel",
                    children: [],
                },
                {
                    key: "ID",
                    value: "1000",
                    children: [],
                },
                {
                    key: "KIND",
                    value: "EDITTEXT",
                    children: [],
                },
                {
                    key: "TEXT2",
                    value: "Lagom bred eller hur",
                    children: [],
                },
                {
                    key: "BOOL",
                    value: "1",
                    children: [],
                },
            ],
        },
    ],
};