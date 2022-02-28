import Int64 = require("node-int64");
import * as Q from "q";
import { MsgIcon, MsgKind, MsgResult } from "./thrift/bindings/frontend_types";
import { SourceLocation } from "./thrift/bindings/shared_types";

/**
 * Provides a dummy implementation of a cspy frontend service
 */
export class FrontendHandler {
    /**
     * Opens a dialog box, and waits for it to be dismissed.
     * Only use this method if you actually need the result.
     * If you only want to display an interactive message
     * to the user and don't care about the result, use
     * messageBoxAsync instead.
     *
     * If <tt>dontAskMgrKey</tt> is non-empty, the implementation may use
     * a "don't ask again" button and store the result to avoid
     * showing the dialog again.
     *
     * If the caption is empty, the dialog should use the application's
     * name as caption.
     */
    messageBox(_msg: string, _caption: string, _icon: MsgIcon, _kind: MsgKind, _dontAskMgrKey: string): Q.Promise<MsgResult> {
        return Q.resolve(MsgResult.kMsgResCancel);
    }

    /**
     * Opens a dialog box with a "OK" button. Returns immediately, without
     * waiting for a response.
     */
    messageBoxAsync(_msg: string, _caption: string, _icon: MsgIcon, _dontAskMgrKey: string): Q.Promise<void> {
        return Q.resolve();
    }

    /**
     * Open a file dialog. If the user cancels the dialog, an empty list
     * of strings is returned.
     */
    openFileDialog(_title: string, _startdir: string, _filter: string, _allowMultiple: boolean, _existing: boolean): Q.Promise<string[]> {
        return Q.resolve([]);
    }

    /**
     * Open a directory selection dialog. If the user cancels the dialog, an empty list
     * of strings is returned.
     */
    openDirectoryDialog(_title: string, _existing: boolean, _startdir: string): Q.Promise<string[]> {
        return Q.resolve([]);
    }

    /**
     * Title is e.g. <tt>"Save trace data"</tt>
     * Filename is e.g. <tt>"trace.txt"</tt>
     * Default extension is e.g. <tt>"txt"</tt>
     * Start dir is e.g. <tt>"/some/path/on/disk"</tt>
     * Filter is e.g. <tt>"Text Files (*.txt)|*.txt|All Files (*.*)|*.*||"</tt>
     */
    openSaveDialog(_title: string, _fileName: string, _defExt: string, _startDir: string, _filter: string): Q.Promise<string[]> {
        return Q.resolve([]);
    }

    /**
     * Opens a dialog containing a progress bar. Returns
     * an opaque identifier. This method returns immediately;
     * there is no guarantee that the progress bar is actually
     * visible to the user.
     */
    createProgressBar(_msg: string, _caption: string, _minvalue: Int64, _maxvalue: Int64, _canCancel: boolean, _indeterminate: boolean): Q.Promise<number> {
        return Q.reject();
    }

    /**
     * Update the progress bar's value. This method is lazy;
     * the progress bar will eventually be updated, unless it is
     * closed before that happens. It returns true if the progress
     * bar has been cancelled.
     */
    updateProgressBarValue(_id: number, _value: Int64): Q.Promise<boolean> {
        return Q.reject();
    }

    /**
     * Update the progress bar's message. This method is lazy;
     * the progress bar message will eventually be updated, unless it is
     * closed before that happens. It returns true if the progress
     * bar has been cancelled.
     */
    updateProgressBarMessage(_id: number, _message: string): Q.Promise<boolean> {
        return Q.reject();
    }

    /**
     * Close the progress bar. This method is lazy; the progress
     * bar will eventually be closed, but there is no guarantee that
     * it has been closed by the time the method returns.
     */
    closeProgressBar(_id: number): Q.Promise<void> {
        return Q.reject();
    }

    showView(_id: string): Q.Promise<void> {
        return Q.resolve();
    }

    /**
     * Generic dialog for selecting one element out of a list.
     *
     * @param title The dialog title.
     * @param message Message string displayed above the elements.
     * @param elements The elements to choose from.
     * @return The index of the selected element, or -1 if the dialog was cancelled.
     */
    openElementSelectionDialog(_title: string, _message: string, _elements: string[]): Q.Promise<number> {
        return Q.resolve(-1);
    }

    /**
     * Generic dialog for selecting multiple elements out of a list.
     */
    openMultipleElementSelectionDialog(_title: string, _message: string, _elements: string[]): Q.Promise<number[]> {
        return Q.reject();
    }

    /**
     * Opens the given file in the eclipse editor
     */
    editSourceLocation(_loc: SourceLocation): Q.Promise<void> {
        return Q.resolve();
    }

    /**
     * Resolves the alias for a specified string. The name of the file to be resolved is sent as
     * input and the returning string is the absolute path to the file to be linked with the
     * specified alias id.
     */
    resolveAliasForFile(_fileName: string, _suggestedFile: string): Q.Promise<string> {
        return Q.reject();
    }
}