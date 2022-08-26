/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MsgIcon, MsgKind, MsgResult } from "iar-vsc-common/thrift/bindings/frontend_types";
import * as vscode from "vscode";
import { CustomEvent, CustomRequest } from "./dap/customRequest";

/**
 * Provides a set of dialogs/windows/progress bars that a debug adapter can spawn by sending custom DAP events.
 * See {@link FrontendHandler} for the debug adapter side of this.
 */
export namespace DialogService {
    const instances: Map<vscode.DebugSession, DialogServiceInstance> = new Map();

    export function initialize(context: vscode.ExtensionContext): void {
        context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {
            if (!instances.has(ev.session)) {
                instances.set(ev.session, new DialogServiceInstance());
            }
            instances.get(ev.session)?.handleEvent(ev);
        }));
    }

    export function dispose() {
        instances.forEach(instance => instance.dispose());
        instances.clear();
    }
}

/**
 * Handles dialogs for one specific debug session.
 */
class DialogServiceInstance implements vscode.Disposable {
    private readonly progressBars: Map<number, ProgressBar> = new Map();

    private readonly OPTION_CANCEL = "Cancel";
    private readonly OPTION_NO     = "No";
    private readonly OPTION_OK     = "Ok";
    private readonly OPTION_YES    = "Yes";
    private readonly OPTIONS_MAP: Record<string, MsgResult> = {
        "Cancel": MsgResult.kMsgResCancel,
        "No":     MsgResult.kMsgResNo,
        "Ok":     MsgResult.kMsgResOk,
        "Yes":    MsgResult.kMsgResYes,
    };

    async handleEvent(ev: vscode.DebugSessionCustomEvent) {
        switch (ev.event) {
        case CustomEvent.Names.MESSAGE_BOX_CREATED: {
            const body = ev.body as CustomEvent.MessageBoxCreatedData;
            let options = [];
            switch (body.kind) {
            case MsgKind.kMsgOk:
                options = [this.OPTION_OK];
                break;
            case MsgKind.kMsgOkCancel:
                options = [this.OPTION_OK, this.OPTION_CANCEL];
                break;
            case MsgKind.kMsgYesNo:
                options = [this.OPTION_YES, this.OPTION_NO];
                break;
            case MsgKind.kMsgYesNoCancel:
                options = [this.OPTION_YES, this.OPTION_NO, this.OPTION_CANCEL];
                break;
            }
            options = options.map(opt => { return { title: opt, isCloseAffordance: false } });
            options[options.length - 1]!.isCloseAffordance = true;
            let result: vscode.MessageItem | undefined = undefined;
            switch (body.icon) {
            case MsgIcon.kMsgIconInfo:
            case MsgIcon.kMsgIconQuestion:
                result = await vscode.window.showInformationMessage(body.title, { modal: true, detail: body.message }, ...options);
                break;
            case MsgIcon.kMsgIconExclaim:
                result = await vscode.window.showWarningMessage(body.title, { modal: true, detail: body.message }, ...options);
                break;
            case MsgIcon.kMsgIconStop:
            default:
                result = await vscode.window.showErrorMessage(body.title, { modal: true, detail: body.message }, ...options);
                break;
            }
            const resultEnum = this.OPTIONS_MAP[result?.title ?? ""] ?? MsgResult.kMsgResCancel;
            const args: CustomRequest.MessageBoxClosedArgs = { id: body.id, result: resultEnum };
            ev.session.customRequest(CustomRequest.Names.MESSAGE_BOX_CLOSED, args);
            break;
        }
        case CustomEvent.Names.OPEN_DIALOG_CREATED: {
            const body = ev.body as CustomEvent.OpenDialogCreatedData;
            const result = await vscode.window.showOpenDialog({
                title: body.title,
                defaultUri: vscode.Uri.file(body.startDir),
                canSelectFiles: body.type === "files",
                canSelectFolders: body.type === "folder",
                canSelectMany: body.allowMultiple,
                filters: DialogServiceInstance.convertFilterToVsCodeFormat(body.filter),
            }) ?? [];
            const args: CustomRequest.OpenDialogClosedArgs = { id: body.id, paths: result.map(uri => uri.fsPath) };
            ev.session.customRequest(CustomRequest.Names.OPEN_DIALOG_CLOSED, args);
            break;
        }
        case CustomEvent.Names.SAVE_DIALOG_CREATED: {
            const body = ev.body as CustomEvent.SaveDialogCreatedData;
            const result = await vscode.window.showSaveDialog({
                title: body.title,
                defaultUri: vscode.Uri.file(body.startPath),
                filters: DialogServiceInstance.convertFilterToVsCodeFormat(body.filter),
            });
            const args: CustomRequest.SaveDialogClosedArgs = { id: body.id, path: result?.fsPath };
            ev.session.customRequest(CustomRequest.Names.SAVE_DIALOG_CLOSED, args);
            break;
        }
        case CustomEvent.Names.PROGRESS_BAR_CREATED: {
            const body = ev.body as CustomEvent.ProgressBarCreatedData;
            vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: body.title, cancellable: body.canCancel }, (progress, _token) => {
                return new Promise<void>((resolve, _) => {
                    progress.report({ message: body.initialMessage });
                    this.progressBars.set(body.id, { close: resolve, progress: progress, value: 0 });
                });
            });
            break;
        }
        case CustomEvent.Names.PROGRESS_BAR_CLOSED: {
            const body = ev.body as CustomEvent.ProgressBarClosedData;
            this.progressBars.get(body.id)?.close();
            this.progressBars.delete(body.id);
            break;
        }
        case CustomEvent.Names.PROGRESS_BAR_UPDATED: {
            const body = ev.body as CustomEvent.ProgressBarUpdatedData;
            const bar = this.progressBars.get(body.id);
            if (bar) {
                if (body.message) {
                    bar.progress.report({ message: body.message });
                }
                if (body.value) {
                    bar.progress.report({ increment: body.value - bar.value });
                }
            }
            break;
        }
        case CustomEvent.Names.ELEMENT_SELECT_CREATED: {
            const body = ev.body as CustomEvent.ElementSelectCreatedData;
            vscode.window.showQuickPick(body.elements, { canPickMany: false, title: `${body.title}: ${body.message}` }).then(selected => {
                const selectedIndex = selected === undefined ? -1 : body.elements.indexOf(selected);
                const args: CustomRequest.ElementSelectedArgs = { id: body.id, selectedIndex };
                ev.session.customRequest(CustomRequest.Names.ELEMENT_SELECTED, args);
            });
            break;
        }
        case CustomEvent.Names.MULTIELEMENT_SELECT_CREATED: {
            const body = ev.body as CustomEvent.MultiElementSelectCreatedData;
            vscode.window.showQuickPick(body.elements, { canPickMany: true, title: `${body.title}: ${body.message}` }).then(selected => {
                const selectedIndices = selected === undefined ? [] : selected.map(elem => body.elements.indexOf(elem));
                const args: CustomRequest.MultiElementSelectedArgs = { id: body.id, selectedIndices };
                ev.session.customRequest(CustomRequest.Names.MULTIELEMENT_SELECTED, args);
            });
            break;
        }
        case CustomEvent.Names.FILE_OPENED: {
            const body = ev.body as CustomEvent.FileOpenedData;
            await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(body.path).with({ fragment: `L${body.line},${body.col}` }));
            break;
        }
        default:
            break;
        }
    }

    dispose() {
        this.progressBars.forEach(bar => bar.close());
    }

    /**
     * Converts a file dialog filter (which may consist of several filter options) on windows format
     * (https://docs.microsoft.com/en-us/dotnet/api/system.windows.forms.filedialog.filter?view=windowsdesktop-6.0#remarks)
     * into the format used by the VS Code api.
     */
    private static convertFilterToVsCodeFormat(filter: string): Record<string, string[]> {
        const fields = filter.split("|");
        const results: Record<string, string[]> = {};
        for (let i = 0; i < fields.length; i += 2) {
            // The user-friendly name
            const filterName          = fields[i];
            // A list of extensions (e.g. '*.txt;*.pdf')
            const filterSpecification = fields[i+1];
            if (!filterName || !filterSpecification) continue;
            results[filterName] = filterSpecification.split(";").map(ext => ext.replace(/^\*\./, ""));
        }
        return results;
    }

}

interface ProgressBar {
    close: () => void;
    progress: vscode.Progress<{ message?: string; increment?: number }>;
    value: number;
}
