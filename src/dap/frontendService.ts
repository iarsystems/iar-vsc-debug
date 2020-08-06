'use strict';

import * as Thrift from "thrift";
import * as Frontend from "./thrift/bindings/Frontend";
import { Server } from "net";
import { MsgIcon, MsgKind, MsgResult } from "./thrift/bindings/frontend_types";
import { SourceLocation } from "./thrift/bindings/shared_types";
import * as Q from "q";

/**
 * Implements the Frontend thrift service.
 * We're only really interested in (and capable of) implementing
 * the progressbar methods, to get status updates from the backend.
 */
export class FrontendHandler {

    messageBox(msg: string, caption: string, icon: MsgIcon, kind: MsgKind, dontAskMgrKey: string): Q.Promise<MsgResult> {
        console.log("messageBox", msg, caption);
        return Q.resolve(MsgResult.kMsgResOk);
    }

    messageBoxAsync(msg: string, caption: string, icon: MsgIcon, dontAskMgrKey: string): Q.Promise<void> {
        console.log("messageBoxAsync", msg, caption);
        return Q.resolve();
    }

    openFileDialog(title: string, startdir: string, filter: string, allowMultiple: boolean, existing: boolean): Q.Promise<string[]> {
        console.log("openFileDialog", title);
        return Q.resolve([]);
    }

    openDirectoryDialog(title: string, existing: boolean, startdir: string): Q.Promise<string[]> {
        console.log("openDirectoryDialog", title);
        return Q.resolve([]);
    }

    openSaveDialog(title: string, fileName: string, defExt: string, startDir: string, filter: string): Q.Promise<string[]> {
        console.log("openSaveDialog", title, fileName);
        return Q.resolve([]);
    }

    private id = 0;
    createProgressBar(msg: string, caption: string, minvalue: Thrift.Int64, maxvalue: Thrift.Int64, canCancel: boolean, indeterminate: boolean): Q.Promise<number> {
        console.log("createProgressBar", msg, caption);
        return Q.resolve(this.id++);
    }

    updateProgressBarValue(id: number, value: Thrift.Int64): Q.Promise<boolean> {
        console.log("updateProgressBarValue", id, value);
        return Q.resolve(false);
    }

    updateProgressBarMessage(id: number, message: string): Q.Promise<boolean> {
        console.log("updateProgressBarMessage", id, message);
        return Q.resolve(false);
    }

    closeProgressBar(id: number): Q.Promise<void> {
        console.log("closeProgressBar", id);
        return Q.resolve();
    }

    showView(id: string): Q.Promise<void> {
        console.log("showView", id);
        return Q.resolve();
    }

    openElementSelectionDialog(title: string, message: string, elements: string[]): Q.Promise<number> {
        console.log("openElementSelectionDialog", title, message, elements);
        return Q.resolve(this.id++);
    }

    openMultipleElementSelectionDialog(title: string, message: string, elements: string[]): Q.Promise<number[]> {
        console.log("openMultipleElementSelectionDialog", title, message, elements);
        return Q.resolve([]);
    }

    editSourceLocation(loc: SourceLocation): Q.Promise<void> {
        console.log("editSourceLocation", loc);
        return Q.resolve();
    }

    resolveAliasForFile(fileName: string, suggestedFile: string): Q.Promise<string> {
        console.log("resolveAliasForFile", fileName, suggestedFile);
        return Q.resolve("");
    }
}