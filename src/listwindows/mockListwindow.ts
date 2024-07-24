/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import {
    ViewMessage,
    RenderParameters,
} from "../../webviews/listwindow/protocol";
import {
    Alignment,
    Cell,
    Column,
    Format,
    ListSpec,
    Row,
    SelRange,
    Target,
    TextStyle,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import Int64 = require("node-int64");
import { MenuItem, SelectionFlags } from "../../webviews/listwindow/thrift/listwindow_types";
import { ListwindowViewProvider } from "./listwindowViewProvider";

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
                break;
            case "rendered":
                break;
            case "HTMLDump":
                break;
            case "columnClicked":
                break;
            case "cellLeftClicked":
                this.view.postMessageToView({
                    subject: "render",
                    params: getMockRenderParams(
                        msg.row,
                        msg.flags === SelectionFlags.kAdd
                            ? msg.row + 2
                            : msg.row,
                    ),
                    ensureRowVisible: msg.row,
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
                this.view.postMessageToView({
                    subject: "editableStringReply",
                    text: "Hello Edit",
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
            case "scrollOperationPressed":
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
    const format = new Format();
    format.align = Alignment.kLeft;
    format.style = TextStyle.kProportionalPlain;
    const editableFormat = new Format();
    editableFormat.align = Alignment.kLeft;
    editableFormat.style = TextStyle.kProportionalPlain;
    editableFormat.editable = true;
    const memFormat = new Format();
    memFormat.align = Alignment.kRight;
    memFormat.style = TextStyle.kFixedPlain;

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
