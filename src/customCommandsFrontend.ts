/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import {CustomRequest} from "./dap/customRequest";
import { DebugSessionTracker } from "./debugSessionTracker";
import { VariablesUtils } from "./dap/contexts/variablesUtils";


/**
 *  Manages any global custom commands the extension registers.
 */
export namespace CustomCommandsFrontend {
    interface Variable {
        name: string;
        variablesReference: number;
    }

    interface VariableContext {
        container?: Variable;
        variable: Variable;
    }

  function isVariable(obj: unknown): obj is Variable {
      if (typeof obj === "object") {
          const variable = obj as Variable;
          return variable.name !== undefined && variable.variablesReference !== undefined;
      }
      return false;
  }

  function isVariableContext(context: unknown): VariableContext | undefined {
      if (
          typeof context !== "object" ||
          !context ||
          !("container" in context) ||
          !("variable" in context)
      ) {
          return undefined;
      }

      let container = undefined;
      if (isVariable(context.container)) {
          container = context.container;
      }
      if (isVariable(context.variable)) {
          return { variable: context.variable, container: container };
      }
      return undefined;
  }

  function registerFormatViewCommand(commandId: string, format: VariablesUtils.ViewFormats) {
      return vscode.commands.registerCommand(commandId, args => {
          const context = isVariableContext(args);
          if (!context || !context.container) {
              return;
          }

          const data: CustomRequest.ChangeVariableViewFormatArgs = {
              parentReference: context.container.variablesReference,
              format: format,
              variableReference: context.variable.variablesReference,
              variable: context.variable.name,
          };
          vscode.debug.activeDebugSession?.customRequest(
              CustomRequest.Names.CHANGE_VIEW_FORMAT_REQUEST,
              data,
          );
      });
  }


  export function initialize(
      context: vscode.ExtensionContext,
      _sessionTracker: DebugSessionTracker
  ) {
      context.subscriptions.push(
          vscode.commands.registerCommand("iar.customRestart", () => {
              if (vscode.debug.activeDebugSession?.type === "cspy") {
                  vscode.debug.activeDebugSession.customRequest("restart");
              }
          }),
      );

      context.subscriptions.push(
          registerFormatViewCommand(
              "iar.showVariableAsDefault",
              VariablesUtils.ViewFormats.kDefault,
          ),
          registerFormatViewCommand(
              "iar.showVariableAsHex",
              VariablesUtils.ViewFormats.kHexaDecimal,
          ),
          registerFormatViewCommand("iar.showVariableAsBinary", VariablesUtils.ViewFormats.kBinary),
          registerFormatViewCommand("iar.showVariableAsOctal", VariablesUtils.ViewFormats.kOctal),
          registerFormatViewCommand(
              "iar.showVariableAsDecimal",
              VariablesUtils.ViewFormats.kDecimal,
          ),
          registerFormatViewCommand("iar.showVariableAsChar", VariablesUtils.ViewFormats.kChar),
          registerFormatViewCommand(
              "iar.showVariableAsFloat16",
              VariablesUtils.ViewFormats.kFloat16,
          ),
          registerFormatViewCommand("iar.showVariableAsFloat", VariablesUtils.ViewFormats.kFloat),
          registerFormatViewCommand("iar.showVariableAsDouble", VariablesUtils.ViewFormats.kDouble),
          registerFormatViewCommand("iar.showVariableAsIs", VariablesUtils.ViewFormats.kAsIs),
      );
  }
}
