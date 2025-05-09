/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as Thrift from "thrift";
import * as Path from "path";
import * as FrontendTypes from "iar-vsc-common/thrift/bindings/frontend_types";
import * as Frontend from "iar-vsc-common/thrift/bindings/Frontend";
import { Capabilities, PropertyTreeItem, SourceLocation } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Q from "q";
import { CustomEvent, CustomRequest } from "./customRequest";
import { Event, logger } from "@vscode/debugadapter";
import { CommandRegistry } from "./commandRegistry";
import {DapEventSink, Disposable, Utils} from "./utils";
import { ThriftServiceHandler } from "iar-vsc-common/thrift/thriftUtils";
import { ColorSchema, ThriftDisplayElement } from "iar-vsc-common/thrift/bindings/themes_types";
import { GenericDialogResults } from "iar-vsc-common/thrift/bindings/frontend_types";
import { unpackTree } from "../utils";
import { OsUtils } from "iar-vsc-common/osUtils";

/**
 * A (handler for a) thrift service that provides various types dialogs to C-SPY. These may be used e.g. to display
 * driver-specific dialogs, such as probe selection or firmware update dialogs.
 *
 * This is communicated to the DAP client (i.e. VS Code) using custom DAP events and requests, with numeric id:s to
 * identify each dialog instance.
 */
export class FrontendHandler implements ThriftServiceHandler<Frontend.Client>, Disposable.Disposable {
    private nextId = 0;

    // Stores promise resolution functions for open UI elements
    private readonly openMessageBoxes: Map<number, (result: FrontendTypes.MsgResult) => void> = new Map();
    private readonly openOpenDialogs: Map<number, (paths: string[]) => void> = new Map();
    private readonly openSaveDialogs: Map<number, (paths: string[]) => void> = new Map();
    private readonly openElementSelectionDialogs: Map<number, (choice: number) => void> = new Map();
    private readonly openMultiElementSelectionDialogs: Map<number, (choices: number[]) => void> = new Map();
    private readonly themeRequests: Map<number, (theme: CustomRequest.ThemeResolvedArgs) => void> = new Map();
    private readonly genericDialogRequests: Map<number, (dialogResults: GenericDialogResults) => void> = new Map();

    // Stores whether the progress bar with a given id has been canceled
    private readonly openProgressBars: Map<number, boolean> = new Map();

    /**
     * Creates a new handler for the frontend service. The caller is responsible for launching the service with this
     * handler.
     * @param eventSink Used to send DAP events to the frontend
     * @param sourceFileMap A set of folder aliases, i.e. a map of source file paths to their corresponding paths in the debug info
     * @param clientSupportsThemes Whether the client can handle the {@link CustomEvent.Names.THEME_REQUESTED} request from the debug adapter
     * @param requestRegistry The registry where this handler should register the DAP requests it can handle
     */
    constructor(
        private readonly eventSink: DapEventSink,
        private readonly sourceFileMap: Record<string, string>,
        private readonly clientSupportsThemes: boolean,
        requestRegistry: CommandRegistry<unknown, unknown>,
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
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.PROGRESS_BAR_CANCELED, CustomRequest.isProgressBarCanceledArgs,
            args => {
                this.openProgressBars.set(args.id, true);
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
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.THEME_RESOLVED, CustomRequest.isThemeResolvedArgs,
            args => {
                this.themeRequests.get(args.id)?.(args);
                this.themeRequests.delete(args.id);
            });
        requestRegistry.registerCommandWithTypeCheck(CustomRequest.Names.GENRIC_DIALOG_RESOLVED, CustomRequest.isGenericDialogResolvedArgs,
            args => {
                const resolver = this.genericDialogRequests.get(args.id);
                if (resolver) {
                    resolver(
                        new GenericDialogResults({
                            items: unpackTree(args.items),
                            type: args.results,
                        }),
                    );
                    this.genericDialogRequests.delete(args.id);
                }
            });
    }

    dispose(): void | Promise<void> {
        // If we abort the session e.g. in the middle of a download, we may have
        // open progress bars that should be closed
        for (const progressBar of this.openProgressBars.keys()) {
            const body: CustomEvent.ProgressBarClosedData = { id: progressBar };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_CLOSED, body));
        }
        this.openProgressBars.clear();
    }

    messageBox(msg: string, caption: string, icon: FrontendTypes.MsgIcon, kind: FrontendTypes.MsgKind, _dontAskMgrKey: string): Q.Promise<FrontendTypes.MsgResult> {
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

    messageBoxAsync(msg: string, caption: string, icon: FrontendTypes.MsgIcon, _dontAskMgrKey: string): Q.Promise<void> {
        const id = this.nextId++;
        const body: CustomEvent.MessageBoxCreatedData = {
            id,
            title: caption || "C-SPY Debugger",
            message: msg,
            kind: FrontendTypes.MsgKind.kMsgOk,
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

    openIHostFileDialog(title: string, type: FrontendTypes.FileDialogType, returnType: FrontendTypes.FileDialogReturnType, filters: FrontendTypes.FileDialogFilter[], options: FrontendTypes.FileDialogOptions[], startdir: string, defaultName: string): Q.Promise<string[]> {
        // Redirect directory queries to the directory dialog.
        if (returnType === FrontendTypes.FileDialogReturnType.kDirectory) {
            return this.openDirectoryDialog(title, options.includes(FrontendTypes.FileDialogOptions.kPathMustExist), startdir);
        }

        // Generate the windows style filter.
        const windowsFilter = Utils.createFilterString(filters);

        if (type === FrontendTypes.FileDialogType.kOpen) {
            const allowMultipleFiles = returnType === FrontendTypes.FileDialogReturnType.kExistingFiles;
            return this.openFileDialog(title, startdir, windowsFilter, allowMultipleFiles, options.includes(FrontendTypes.FileDialogOptions.kFileMustExist));
        }

        return this.openSaveDialog(title, defaultName, "", startdir, windowsFilter);
    }

    createProgressBar(msg: string, caption: string, minvalue: Thrift.Int64, maxvalue: Thrift.Int64, canCancel: boolean, _indeterminate: boolean): Q.Promise<number> {
        const id = this.nextId++;
        const body: CustomEvent.ProgressBarCreatedData = { id, title: caption, initialMessage: msg, canCancel,
            minValue: minvalue.toNumber(), valueRange: (maxvalue.toNumber() - minvalue.toNumber()) };
        this.openProgressBars.set(id, false);
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_CREATED, body));
        return Q.resolve(id);
    }

    updateProgressBarValue(id: number, value: Thrift.Int64): Q.Promise<boolean> {
        const body: CustomEvent.ProgressBarUpdatedData = { id, value: value.toNumber() };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_UPDATED, body));
        return Q.resolve(this.openProgressBars.get(id) ?? false);
    }

    updateProgressBarMessage(id: number, message: string): Q.Promise<boolean> {
        const body: CustomEvent.ProgressBarUpdatedData = { id, message };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_UPDATED, body));
        return Q.resolve(this.openProgressBars.get(id) ?? false);
    }

    closeProgressBar(id: number): Q.Promise<void> {
        const body: CustomEvent.ProgressBarClosedData = { id };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.PROGRESS_BAR_CLOSED, body));
        this.openProgressBars.delete(id);
        return Q.resolve();
    }

    // We can't support this since we don't have any custom views yet
    showView(id: string): Q.Promise<void> {
        const body: CustomEvent.ShowViewRequestData = { viewId: id};
        this.eventSink.sendEvent(new Event(CustomEvent.Names.SHOW_VIEW_REQUEST, body));
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

    editSourceLocation(loc: SourceLocation, _focus?: boolean): Q.Promise<void> {
        const body: CustomEvent.FileOpenedData = { path: loc.filename, line: loc.line, col: loc.col };
        this.eventSink.sendEvent(new Event(CustomEvent.Names.FILE_OPENED, body));
        return Q.resolve();
    }

    handlesAliasStorage(): Q.Promise<boolean> {
        return Q.resolve(true);
    }

    loadAliases(): Q.Promise<Record<string, string>> {
        // The cspy kernel works on *file* aliases, not folders, so we create
        // mappings for dummy files. The kernel can use this to derive mappings
        // for other files in nearby folders, so effectively this is equivalent
        // to a folder alias.
        const fileAliases: Record<string, string> = {};
        for (const [sourcePath, diPath] of Object.entries(this.sourceFileMap)) {
            fileAliases[Path.join(sourcePath, "dummy.txt")] = Path.join(diPath, "dummy.txt");
        }
        return Q.resolve(fileAliases);
    }

    resolveAliasForFile(fileName: string, suggestedFile: string): Q.Promise<string> {
        if (OsUtils.OsType.Linux === OsUtils.detectOsType()) {
            // This may be a windows path, treat backslashes as directory separators
            fileName = fileName.replace(/\\/g, "/");
        }
        for (let sourcePath in this.sourceFileMap) {
            if (OsUtils.OsType.Linux === OsUtils.detectOsType()) {
                // This may be a windows path, treat backslashes as directory separators
                sourcePath = sourcePath.replace(/\\/g, "/");
            }
            const rel = Path.relative(sourcePath, fileName);
            if (!rel.startsWith("..") && !Path.isAbsolute(rel)) {
                const targetPath = this.sourceFileMap[sourcePath];
                if (targetPath !== undefined) {
                    logger.verbose(`Resolving '${fileName}' to '${Path.join(targetPath, rel)}'`);
                    return Q.resolve(Path.join(targetPath, rel));
                }
            }
        }

        logger.warn(
            `The source file '${fileName}' was not found. To use an alias for this file, add a "sourceFileMap" to your launch.json config.`,
        );
        return Q.resolve(suggestedFile);
    }

    showFileProperties(_filePath: string): Q.Promise<void> {
        return Q.resolve();
    }

    openFileExplorer(_filePath: string): Q.Promise<void> {
        return Q.resolve();
    }

    invokeDialog(
        id: string,
        title: string,
        properties: PropertyTreeItem,
    ): Q.Promise<GenericDialogResults> {
        const resultId = this.nextId++;
        return Q.Promise((resolve, _) => {
            this.genericDialogRequests.set(resultId, resolve);
            const body: CustomEvent.ShowGenericDialogRequestData = {
                id: resultId,
                dialogId: id,
                items: properties,
                title: title,
            };
            this.eventSink.sendEvent(new Event(CustomEvent.Names.DO_GENERIC_DIALOG_REQUEST, body));
        });
    }

    getActiveTheme(): Q.Promise<Record<ThriftDisplayElement, ColorSchema>> {
        if (!this.clientSupportsThemes) {
            return Q.reject(new Error("Themes are not supported"));
        }

        function toCspyTheme(vscodeTheme: CustomRequest.ThemeResolvedArgs["theme"]) {
            function toColorSchema(color: CustomRequest.ThemeColor) {
                return new ColorSchema({ R: color.r, B: color.b, G: color.g });
            }

            const bg            = toColorSchema(vscodeTheme.bg);
            const fg            = toColorSchema(vscodeTheme.fg);
            const disabledFg    = toColorSchema(vscodeTheme.disabledFg);
            const highlightedFg = toColorSchema(vscodeTheme.highlightedFg);
            const pc            = toColorSchema(vscodeTheme.pc);
            const theme: Partial<Record<ThriftDisplayElement, ColorSchema>> = {
                // Backgrounds
                [ThriftDisplayElement.kWindowBg]:           bg,
                [ThriftDisplayElement.kMdiClientBg]:        bg,
                [ThriftDisplayElement.kWatchFamilyBg]:      bg,
                [ThriftDisplayElement.kStackFamilyBg]:      bg,
                [ThriftDisplayElement.kDisasmFamilyBg]:     bg,
                [ThriftDisplayElement.kMemoryFamilyBg]:     bg,
                [ThriftDisplayElement.kBreakpointFamilyBg]: bg,
                [ThriftDisplayElement.kTraceFamilyBg]:      bg,
                [ThriftDisplayElement.kProfilerFamilyBg]:   bg,
                [ThriftDisplayElement.kInterruptFamilyBg]:  bg,
                [ThriftDisplayElement.kStateFamilyBg]:      bg,
                [ThriftDisplayElement.kDataLogFamilyBg]:    bg,
                [ThriftDisplayElement.kPowerLogFamilyBg]:   bg,
                [ThriftDisplayElement.kEventLogFamilyBg]:   bg,
                [ThriftDisplayElement.kRegisterFamilyBg]:   bg,
                [ThriftDisplayElement.kSideMargin]:         bg,

                // Foregrounds
                [ThriftDisplayElement.kText]:         fg,
                [ThriftDisplayElement.kDistinctText]: fg,
                [ThriftDisplayElement.kGrayText]:     disabledFg,
                [ThriftDisplayElement.kDisabledText]: disabledFg,
                [ThriftDisplayElement.kValueChangedText]: highlightedFg,

                // Pc
                [ThriftDisplayElement.kCurrentPc]:              pc,
                [ThriftDisplayElement.kCurrentPcStatementOnly]: pc,
                [ThriftDisplayElement.kAlternativePc]:          pc,
            };
            // Fill in the rest with a noticeable color (red). These are either
            // only used by the MFC/QT frontends, or only used by windows we do
            // not support (e.g. disassembly or memory), so they *should* never
            // be used.
            for (const value of Object.keys(ThriftDisplayElement).
                map(v => Number(v)).
                filter(v => !isNaN(v))) {
                if (!(value in theme)) {
                    theme[value as ThriftDisplayElement] = new ColorSchema({
                        R: 255,
                        G: 0,
                        B: 0,
                    });
                }
            }
            return theme as Record<ThriftDisplayElement, ColorSchema>;
        }

        const id = this.nextId++;
        return Q.Promise(resolve => {
            this.themeRequests.set(id, response => {
                resolve(toCspyTheme(response.theme));
            });
            const body: CustomEvent.ThemeRequestedData = { id };
            this.eventSink.sendEvent(
                new Event(CustomEvent.Names.THEME_REQUESTED, body),
            );
        });
    }

    getCapabilities(): Q.Promise<Capabilities> {
        return Q.resolve(new Capabilities({supportsEditorHighlight: true}));
    }
}