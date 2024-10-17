/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import { DebugSessionTracker } from "./debugSessionTracker";

/**
 *  Manages any global custom commands the extension registers.
 */
export namespace CustomCommandsFrontend {
  export function initialize(
      context: vscode.ExtensionContext,
      _sessionTracker: DebugSessionTracker
  ) {
      context.subscriptions.push(
          vscode.commands.registerCommand("iar.customRestart", () => {
              if (vscode.debug.activeDebugSession?.type === "cspy") {
                  vscode.debug.activeDebugSession.customRequest("restart");
              }
          })
      );
  }
}
