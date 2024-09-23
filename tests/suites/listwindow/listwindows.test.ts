/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as assert from "assert";
import {
    ExtensionMessage,
    ExtensionMessageVariant,
    RenderParameters,
} from "../../../webviews/listwindow/protocol";
import * as vscode from "vscode";
import { TestUtils } from "../testUtils";
import { listwindowManager } from "../../../src/extension";
import { StandardListwindowController } from "../../../src/listwindows/standardListwindowController";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import { unpackTree } from "../../../src/utils";
import { ListwindowController } from "../../../src/listwindows/listwindowController";
import {
    Tags,
    ToolbarItemType,
} from "../../../webviews/listwindow/rendering/toolbar/toolbarConstants";
import { SlidingListwindowController } from "../../../src/listwindows/slidingListwindowController";
import { isStringObject } from "util/types";

suite("Listwindow-Controller", () => {
    let dbgConfig: vscode.DebugConfiguration;
    let activeSession: vscode.DebugSession;
    const msgs: ExtensionMessage[] = [];

    vscode.debug.onDidStartDebugSession(session => {
        activeSession = session;
    });

    suiteSetup(async() => {
        const ext = vscode.extensions.getExtension("iarsystems.iar-debug");
        assert(ext, "Extension is not installed, did its name change?");
        await ext.activate();

        dbgConfig = TestUtils.doSetup();
    });

    setup(async function() {
        console.log("\n==> " + this.currentTest!.title);
        await vscode.debug.startDebugging(undefined, dbgConfig);
        await TestUtils.wait(4000);
    });

    teardown(async() => {
        await vscode.debug.stopDebugging(activeSession);
        await TestUtils.wait(2000);
        console.log("\n==> " + "Done");
    });

    async function waitFor<T>(condition: () => T | undefined, timeout = 2000) {
        const startTime = Date.now();
        while (true) {
            if (Date.now() - startTime > timeout) {
                throw new Error("Wait failed!");
            }
            const item = condition();
            if (item !== undefined) {
                return item;
            }
            // Make a small wait to allow vscode
            // to work on pending updated.
            await TestUtils.wait(10);
        }
    }

    // Wait for the controller to emit a given message.
    function waitForMessage(msg: string, timeout = 2000) {
        const condition = () => {
            const item = msgs.shift();
            if (item !== undefined && item.subject === msg) {
                return item;
            }
            return undefined;
        };

        return waitFor<ExtensionMessage>(condition, timeout);
    }

    // Wait for a row to appear in the listwindow.
    function waitForRow(columnHeader: string, content: string, timeout = 2000) {
        const condition = () => {
            const item = msgs.shift();
            if (item !== undefined && item.subject === "render") {
                const rowContent = findRow(item.params, columnHeader, content);
                if (rowContent) {
                    return rowContent;
                }
            }
            return undefined;
        };

        return waitFor<string[]>(condition, timeout);
    }

    // Wait for some content to appear in the listwindow.
    function waitForContent(timeout = 2000) {
        const condition = () => {
            const item = msgs.shift();
            if (item !== undefined && item.subject === "render") {
                if (item.params.rows.length > 0) return item.params;
            }
            return undefined;
        };

        return waitFor<RenderParameters>(condition, timeout);
    }

    function getToolbarItemId(
        toolbarDesc: PropertyTreeItem,
        matcher: (item: PropertyTreeItem) => boolean,
    ): string {
        let realId = "";
        toolbarDesc.children.find(item => {
            const idItem = item.children.find(property => {
                return matcher(property);
            });
            if (idItem !== undefined) {
                const id = item.children.find(property => {
                    return property.key === Tags.kKeyItemId;
                });
                if (id !== undefined) {
                    realId = id.value;
                }
            }
        });
        return realId;
    }

    // Interact with a toolbar item with either 1. The given itemId or 2.
    // the first object of type \param type.
    function interact(
        controller: ListwindowController,
        toolbarDesc: PropertyTreeItem,
        itemId: string | ((item: PropertyTreeItem) => boolean),
        value: string,
    ): string | undefined {
        const realId = isStringObject(itemId)
            ? itemId
            : getToolbarItemId(toolbarDesc, itemId);
        if (realId.length === 0) {
            return undefined;
        }

        controller.handleMessageFromView({
            subject: "toolbarItemInteraction",
            id: realId,
            properties: {
                key: "",
                value: "",
                children: [
                    { key: "int0", value: "1", children: [] },
                    { key: "str0", value: value, children: [] },
                ],
            },
        });
        return realId;
    }

    // Locate the content of a row by identifying searching for the \param content in column
    // with description \param column.
    function findRow(
        params: RenderParameters,
        columnHeader: string,
        content: string,
    ): string[] | undefined {
        // Locate the index of the column.
        const index = params.columnInfo.findIndex(column => {
            return column.title === columnHeader;
        });
        if (index !== -1) {
            const cells = params.rows.find(row => {
                const cellindex = row.cells.findIndex(cell => {
                    return cell.text.includes(content);
                });
                return cellindex !== -1;
            });
            if (cells) {
                const cellContent: string[] = [];
                cells.cells.forEach(cell => {
                    cellContent.push(cell.text);
                });
                return cellContent;
            }
        }
        return undefined;
    }

    async function getState(
        controller: ListwindowController,
    ): Promise<[RenderParameters, PropertyTreeItem]> {
        controller.handleMessageFromView({ subject: "loaded" });
        const render = (await waitForMessage(
            "render",
            4000,
        )) as ExtensionMessageVariant<"render">;

        // Collect the toolbar
        const toolbarMsg = (await waitForMessage(
            "renderToolbar",
            4000,
        )) as ExtensionMessageVariant<"renderToolbar">;
        assert.ok(toolbarMsg);
        assert.ok(toolbarMsg.params.children.length > 0);
        return [render.params, unpackTree(toolbarMsg.params)];
    }

    test("Test Quick watch", async() => {
        const backendHandler =
            listwindowManager?.getBackendHandler("WIN_QUICK_WATCH");
        assert.ok(backendHandler);
        const controller = backendHandler.activeController;
        assert.ok(controller);

        // The quickwatch windows should be of type standard.
        assert.ok(controller as StandardListwindowController);

        // Hijack the message sink so the test can capture all communication with the
        // view.
        controller.setMessageSink(msg => {
            msgs.push(msg);
        });

        msgs.length = 0; // Clear the msg-array
        const [_, toolbarTree] = await getState(controller);

        // Enter a into the toolbar item.
        msgs.length = 0; // Clear the msg-array
        assert.ok(
            interact(
                controller,
                toolbarTree,
                (item: PropertyTreeItem) => {
                    return (
                        item.key === Tags.kKeyItemKind &&
                        item.value === ToolbarItemType.kKindEditTextDyn.toString()
                    );
                },
                "callCount",
            ),
        );

        const row = await waitForRow("Expression", "callCount", 4000);
        assert.ok(row);
        assert.strictEqual(row[1], "-1");
    });

    test("Test Trace window", async() => {
        //
        const backendHandler = listwindowManager?.getBackendHandler(
            "WIN_SLIDING_TRACE_WINDOW",
        );
        assert.ok(backendHandler, "Wrong id for window?");
        const controller = backendHandler.activeController;
        assert.ok(controller);

        // The trace window should be of type sliding.
        assert.ok(controller as SlidingListwindowController);
        controller.setMessageSink(msg => {
            msgs.push(msg);
        });

        // Ensure that trace is on.
        // Start by getting the current state of the trace-on button.
        // eslint-disable-next-line prefer-const
        let [renderParams, toolbarTree] = await getState(controller);
        if (renderParams.rows.length === 0) {
            // Need to turn trace on.
            msgs.length = 0;
            const id = interact(
                controller,
                toolbarTree,
                item => {
                    return (
                        item.key === Tags.kKeyItemStr &&
                        item.value === "IDI_DBU_TRACE_ONOFF"
                    );
                },
                "on",
            );
            assert.ok(id);
            await waitForMessage("render", 2000);

            msgs.length = 0;
            await activeSession.customRequest("next", {
                threadId: 0,
                singleThread: true,
            });
            await waitForMessage("render", 4000);

            // Ensure that the controller believes that we have some visible rows.
            controller.handleMessageFromView({
                subject: "viewportChanged",
                rowsInPage: 10,
            });
            renderParams = await waitForContent(4000);
        }

        assert.ok(renderParams);
        // Ensure that we've received some trace.
        assert.ok(renderParams.rows.length > 0);
    });
});
