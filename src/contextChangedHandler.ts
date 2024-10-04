/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { CustomEvent } from "./dap/customRequest";

/**
 * Handles the custom event "contextChanged" from the debug adapter, by moving
 * the text editor to the new context location.
 */
export namespace ContextChangedHandler {

    export function initialize() {
        vscode.debug.onDidReceiveDebugSessionCustomEvent(async ev => {
            if (ev.event === CustomEvent.Names.CONTEXT_CHANGED) {
                const body = ev.body as CustomEvent.ContextChangedData;

                const editor = await vscode.window.showTextDocument(
                    vscode.Uri.file(body.file.path),
                );

                // VS Code uses 1-based line and column numbers for DAP
                // communication, but 0-based for its own API.
                const startLine = body.startLine - 1;
                const startColumn = body.startColumn - 1;
                const endLine = body.endLine - 1;
                const endColumn = body.endColumn - 1;

                editor.revealRange(
                    new vscode.Range(
                        startLine,
                        startColumn,
                        endLine,
                        endColumn,
                    ),
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport,
                );
                editor.selection = new vscode.Selection(
                    new vscode.Position(startLine, startColumn),
                    new vscode.Position(endLine, endColumn),
                );
            }
        });
    }

}