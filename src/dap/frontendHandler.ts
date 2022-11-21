/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as Thrift from "thrift";
import * as Path from "path";
import * as Frontend from "iar-vsc-common/thrift/bindings/frontend_types";
import { SourceLocation } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Q from "q";
import { CustomEvent, CustomRequest } from "./customRequest";
import { Event, logger } from "@vscode/debugadapter";
import { CommandRegistry } from "./commandRegistry";
import {DapEventSink, Utils} from "./utils";

/**
 * A (handler for a) thrift service that provides various types dialogs to C-SPY. These may be used e.g. to display
 * driver-specific dialogs, such as probe selection or firmware update dialogs.
 *
 * This is communicated to the DAP client (i.e. VS Code) using custom DAP events and requests, with numeric id:s to
 * identify each dialog instance.
 */
export class FrontendHandler {
    private nextId = 0;

    private readonly openMessageBoxes: Map<number, (result: Frontend.MsgResult) => void> = new Map();
    private readonly openOpenDialogs: Map<number, (paths: string[]) => void> = new Map();
    private readonly openSaveDialogs: Map<number, (paths: string[]) => void> = new Map();
    private readonly openElementSelectionDialogs: Map<number, (choice: number) => void> = new Map();
    private readonly openMultiElementSelectionDialogs: Map<number, (choices: number[]) => void> = new Map();

    /**
     * Creates a new handler for the frontend service. The caller is responsible for launching the service with this
     * handler.
     * @param eventSink Used to send DAP events to the frontend
     * @param sourceFileMap A set of path mappings/translations to use to resolve nonexistent source files
     * @param requestRegistry The registry where this handler should register the DAP requests it can handle
     */
    constructor(
        private readonly eventSink: DapEventSink,
        private readonly sourceFileMap: Record<string, string>,
        requestRegistry: CommandRegistry<unknown, unknown>
    ) {
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.MESSAGE_BOX_CLOSED, CustomRequest.isMessageBoxClosedArgs,
            args => {
                this.openMessageBoxes.get(args.id)?.(args.result);
                this.openMessageBoxes.delete(args.id);
            });
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.OPEN_DIALOG_CLOSED, CustomRequest.isOpenDialogClosedArgs,
            args => {
                this.openOpenDialogs.get(args.id)?.(args.paths);
                this.openOpenDialogs.delete(args.id);
            });
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.SAVE_DIALOG_CLOSED, CustomRequest.isSaveDialogClosedArgs,
            args => {
                this.openSaveDialogs.get(args.id)?.(args.path ? [args.path] : []);
                this.openSaveDialogs.delete(args.id);
            });
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.ELEMENT_SELECTED, CustomRequest.isElementSelectedArgs,
            args => {
                this.openElementSelectionDialogs.get(args.id)?.(args.selectedIndex);
                this.openElementSelectionDialogs.delete(args.id);
            });
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.MULTIELEMENT_SELECTED, CustomRequest.isMultiElementSelectedArgs,
            args => {
                this.openMultiElementSelectionDialogs.get(args.id)?.(args.selectedIndices);
                this.openMultiElementSelectionDialogs.delete(args.id);
            });
    }

    messageBox(msg: string, caption: string, icon: Frontend.MsgIcon, kind: Frontend.MsgKind, _dontAskMgrKey: string): Q.Promise<Frontend.MsgResult> {
        const id = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.openMessageBoxes.set(id, resolve);
            const body: CustomEvent.MessageBoxCreatedData = {
                id,
                title: caption || "C-SPY Debugger",
                message: msg,
                kind,
                icon,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.MESSAGE_BOX_CREATED, body));
        });
    }

    messageBoxAsync(msg: string, caption: string, icon: Frontend.MsgIcon, _dontAskMgrKey: string): Q.Promise<void> {
        const id = this.nextId++;
        const body: CustomEvent.MessageBoxCreatedData = {
            id,
            title: caption || "C-SPY Debugger",
            message: msg,
            kind: Frontend.MsgKind.kMsgOk,
            icon,
        };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.MESSAGE_BOX_CREATED, body));
        return Q.resolve();
    }

    openFileDialog(title: string, startDir: string, filter: string, allowMultiple: boolean, _existing: boolean): Q.Promise<string[]> {
        const id = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.openOpenDialogs.set(id, resolve);
            const body: CustomEvent.OpenDialogCreatedData = {
                id,
                title,
                startDir,
                type: "files",
                filter,
                allowMultiple,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.OPEN_DIALOG_CREATED, body));
        });
    }

    openDirectoryDialog(title: string, _existing: boolean, startDir: string): Q.Promise<string[]> {
        const id = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.openOpenDialogs.set(id, resolve);
            const body: CustomEvent.OpenDialogCreatedData = {
                id,
                title,
                startDir,
                type: "folder",
                filter: "",
                allowMultiple: false,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.OPEN_DIALOG_CREATED, body));
        });
    }

    openSaveDialog(title: string, fileName: string, _defExt: string, startDir: string, filter: string): Q.Promise<string[]> {
        const id = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.openSaveDialogs.set(id, resolve);
            const body: CustomEvent.SaveDialogCreatedData = {
                id,
                title,
                startPath: Path.join(startDir, fileName),
                filter,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.SAVE_DIALOG_CREATED, body));
        });
    }

    openIHostFileDialog(title: string, type: Frontend.FileDialogType, returnType: Frontend.FileDialogReturnType, filters: Frontend.FileDialogFilter[], options: Frontend.FileDialogOptions[], startdir: string, defaultName: string): Q.Promise<string[]> {
        // Redirect directory queries to the directory dialog.
        if (returnType === Frontend.FileDialogReturnType.kDirectory) {
            return this.openDirectoryDialog(title, options.includes(Frontend.FileDialogOptions.kPathMustExist), startdir);
        }

        // Generate the windows style filter.
        const windowsFilter = Utils.createFilterString(filters);

        if (type === Frontend.FileDialogType.kOpen) {
            const allowMultipleFiles = returnType === Frontend.FileDialogReturnType.kExistingFiles;
            return this.openFileDialog(title, startdir, windowsFilter, allowMultipleFiles, options.includes(Frontend.FileDialogOptions.kFileMustExist));
        }

        return this.openSaveDialog(title, defaultName, "", startdir, windowsFilter);
    }

    createProgressBar(msg: string, caption: string, minvalue: Thrift.Int64, maxvalue: Thrift.Int64, canCancel: boolean, _indeterminate: boolean): Q.Promise<number> {
        const body: CustomEvent.ProgressBarCreatedData = { id: this.nextId, title: caption, initialMessage: msg, canCancel,
            minValue: minvalue.toNumber(), valueRange: (maxvalue.toNumber() - minvalue.toNumber()) };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_CREATED, body));
        return Q.resolve(this.nextId++);
    }

    updateProgressBarValue(id: number, value: Thrift.Int64): Q.Promise<boolean> {
        const body: CustomEvent.ProgressBarUpdatedData = { id, value: value.toNumber() };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_UPDATED, body));
        return Q.resolve(false);
    }

    updateProgressBarMessage(id: number, message: string): Q.Promise<boolean> {
        const body: CustomEvent.ProgressBarUpdatedData = { id, message };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_UPDATED, body));
        return Q.resolve(false);
    }

    closeProgressBar(id: number): Q.Promise<void> {
        const body: CustomEvent.ProgressBarClosedData = { id };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_CLOSED, body));
        return Q.resolve();
    }

    // We can't support this since we don't have any custom views yet
    showView(_id: string): Q.Promise<void> {
        return Q.resolve();
    }

    openElementSelectionDialog(title: string, message: string, elements: string[]): Q.Promise<number> {
        const id = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.openElementSelectionDialogs.set(id, resolve);
            const body: CustomEvent.ElementSelectCreatedData = {
                id,
                title,
                message,
                elements,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.ELEMENT_SELECT_CREATED, body));
        });
    }

    openMultipleElementSelectionDialog(title: string, message: string, elements: string[]): Q.Promise<number[]> {
        const id = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.openMultiElementSelectionDialogs.set(id, resolve);
            const body: CustomEvent.MultiElementSelectCreatedData = {
                id,
                title,
                message,
                elements,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.MULTIELEMENT_SELECT_CREATED, body));
        });
    }

    editSourceLocation(loc: SourceLocation): Q.Promise<void> {
        const body: CustomEvent.FileOpenedData = { path: loc.filename, line: loc.line, col: loc.col };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.FILE_OPENED, body));
        return Q.resolve();
    }

    resolveAliasForFile(fileName: string, suggestedFile: string): Q.Promise<string> {
        for (const sourcePath in this.sourceFileMap) {
            const rel = Path.relative(sourcePath, fileName);
            if (!rel.startsWith("..") && !Path.isAbsolute(rel)) {
                const targetPath = this.sourceFileMap[sourcePath];
                if (targetPath !== undefined) {
                    logger.verbose(`Resolving '${fileName}' to '${Path.join(targetPath, rel)}'`);
                    return Q.resolve(Path.join(targetPath, rel));
                }
            }
        }
        logger.verbose(`Could not resolve source path '${fileName}'`);
        return Q.resolve(suggestedFile);
    }

    showFileProperties(_filePath: string): Q.Promise<void> {
        return Q.resolve();
    }

    openFileExplorer(_filePath: string): Q.Promise<void> {
        return Q.resolve();
    }
}