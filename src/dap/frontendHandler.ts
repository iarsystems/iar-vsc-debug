/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import * as Thrift from "thrift";
import { MsgIcon, MsgKind, MsgResult } from "iar-vsc-common/thrift/bindings/frontend_types";
import { SourceLocation } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Q from "q";

/**
 * Implements a dummy Frontend thrift service, which automatically replies and tries to give "neutral" answers to all requests.
 * This is needed because C-SPY sometimes requires a frontend service (see e.g. VSC-223).
 */
export class FrontendHandler {

    messageBox(_msg: string, _caption: string, _icon: MsgIcon, _kind: MsgKind, _dontAskMgrKey: string): Q.Promise<MsgResult> {
        return Q.resolve(MsgResult.kMsgResCancel);
    }

    messageBoxAsync(_msg: string, _caption: string, _icon: MsgIcon, _dontAskMgrKey: string): Q.Promise<void> {
        return Q.resolve();
    }

    openFileDialog(_title: string, _startdir: string, _filter: string, _allowMultiple: boolean, _existing: boolean): Q.Promise<string[]> {
        return Q.resolve([]);
    }

    openDirectoryDialog(_title: string, _existing: boolean, _startdir: string): Q.Promise<string[]> {
        return Q.resolve([]);
    }

    openSaveDialog(_title: string, _fileName: string, _defExt: string, _startDir: string, _filter: string): Q.Promise<string[]> {
        return Q.resolve([]);
    }

    private id = 0;
    createProgressBar(_msg: string, _caption: string, _minvalue: Thrift.Int64, _maxvalue: Thrift.Int64, _canCancel: boolean, _indeterminate: boolean): Q.Promise<number> {
        return Q.resolve(this.id++);
    }

    updateProgressBarValue(_id: number, _value: Thrift.Int64): Q.Promise<boolean> {
        return Q.resolve(false);
    }

    updateProgressBarMessage(_id: number, _message: string): Q.Promise<boolean> {
        return Q.resolve(false);
    }

    closeProgressBar(_id: number): Q.Promise<void> {
        return Q.resolve();
    }

    showView(_id: string): Q.Promise<void> {
        return Q.resolve();
    }

    openElementSelectionDialog(_title: string, _message: string, _elements: string[]): Q.Promise<number> {
        return Q.resolve(-1);
    }

    openMultipleElementSelectionDialog(_title: string, _message: string, _elements: string[]): Q.Promise<number[]> {
        return Q.resolve([]);
    }

    editSourceLocation(_loc: SourceLocation): Q.Promise<void> {
        return Q.resolve();
    }

    resolveAliasForFile(_fileName: string, _suggestedFile: string): Q.Promise<string> {
        return Q.resolve("");
    }
}