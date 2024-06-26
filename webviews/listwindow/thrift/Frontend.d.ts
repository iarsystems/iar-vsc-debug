/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { frontend } from "./frontend_types";


/**
 * Provides frontend services to the C-SPY debugger, such as interactive
 * dialogs, progress monitoring, etc.
 */
export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

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
  messageBox(msg: string, caption: string, icon: MsgIcon, kind: MsgKind, dontAskMgrKey: string): Q.Promise<MsgResult>;

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
  messageBox(msg: string, caption: string, icon: MsgIcon, kind: MsgKind, dontAskMgrKey: string, callback?: (data: MsgResult)=>void): void;

  /**
   * Opens a dialog box with a "OK" button. Returns immediately, without
   * waiting for a response.
   */
  messageBoxAsync(msg: string, caption: string, icon: MsgIcon, dontAskMgrKey: string): Q.Promise<void>;

  /**
   * Opens a dialog box with a "OK" button. Returns immediately, without
   * waiting for a response.
   */
  messageBoxAsync(msg: string, caption: string, icon: MsgIcon, dontAskMgrKey: string, callback?: (data: void)=>void): void;

  /**
   * Open a file dialog. If the user cancels the dialog, an empty list
   * of strings is returned.
   */
  openFileDialog(title: string, startdir: string, filter: string, allowMultiple: boolean, existing: boolean): Q.Promise<string[]>;

  /**
   * Open a file dialog. If the user cancels the dialog, an empty list
   * of strings is returned.
   */
  openFileDialog(title: string, startdir: string, filter: string, allowMultiple: boolean, existing: boolean, callback?: (data: string[])=>void): void;

  /**
   * Open a file dialog. If the user cancels the dialog, an empty list
   * of strings is returned.
   */
  openIHostFileDialog(title: string, type: FileDialogType, returnType: FileDialogReturnType, filters: FileDialogFilter[], options: FileDialogOptions[], startdir: string, defaultName: string): Q.Promise<string[]>;

  /**
   * Open a file dialog. If the user cancels the dialog, an empty list
   * of strings is returned.
   */
  openIHostFileDialog(title: string, type: FileDialogType, returnType: FileDialogReturnType, filters: FileDialogFilter[], options: FileDialogOptions[], startdir: string, defaultName: string, callback?: (data: string[])=>void): void;

  showFileProperties(filePath: string): Q.Promise<void>;

  showFileProperties(filePath: string, callback?: (data: void)=>void): void;

  openFileExplorer(filePath: string): Q.Promise<void>;

  openFileExplorer(filePath: string, callback?: (data: void)=>void): void;

  /**
   * Open a directory selection dialog. If the user cancels the dialog, an empty list
   * of strings is returned.
   */
  openDirectoryDialog(title: string, existing: boolean, startdir: string): Q.Promise<string[]>;

  /**
   * Open a directory selection dialog. If the user cancels the dialog, an empty list
   * of strings is returned.
   */
  openDirectoryDialog(title: string, existing: boolean, startdir: string, callback?: (data: string[])=>void): void;

  /**
   * Title is e.g. <tt>"Save trace data"</tt>
   * Filename is e.g. <tt>"trace.txt"</tt>
   * Default extension is e.g. <tt>"txt"</tt>
   * Start dir is e.g. <tt>"/some/path/on/disk"</tt>
   * Filter is e.g. <tt>"Text Files (*.txt)|*.txt|All Files (*.*)|*.*||"</tt>
   */
  openSaveDialog(title: string, fileName: string, defExt: string, startDir: string, filter: string): Q.Promise<string[]>;

  /**
   * Title is e.g. <tt>"Save trace data"</tt>
   * Filename is e.g. <tt>"trace.txt"</tt>
   * Default extension is e.g. <tt>"txt"</tt>
   * Start dir is e.g. <tt>"/some/path/on/disk"</tt>
   * Filter is e.g. <tt>"Text Files (*.txt)|*.txt|All Files (*.*)|*.*||"</tt>
   */
  openSaveDialog(title: string, fileName: string, defExt: string, startDir: string, filter: string, callback?: (data: string[])=>void): void;

  /**
   * Opens a dialog containing a progress bar. Returns
   * an opaque identifier. This method returns immediately;
   * there is no guarantee that the progress bar is actually
   * visible to the user.
   */
  createProgressBar(msg: string, caption: string, minvalue: Int64, maxvalue: Int64, canCancel: boolean, indeterminate: boolean): Q.Promise<number>;

  /**
   * Opens a dialog containing a progress bar. Returns
   * an opaque identifier. This method returns immediately;
   * there is no guarantee that the progress bar is actually
   * visible to the user.
   */
  createProgressBar(msg: string, caption: string, minvalue: Int64, maxvalue: Int64, canCancel: boolean, indeterminate: boolean, callback?: (data: number)=>void): void;

  /**
   * Update the progress bar's value. This method is lazy;
   * the progress bar will eventually be updated, unless it is
   * closed before that happens. It returns true if the progress
   * bar has been cancelled.
   */
  updateProgressBarValue(id: number, value: Int64): Q.Promise<boolean>;

  /**
   * Update the progress bar's value. This method is lazy;
   * the progress bar will eventually be updated, unless it is
   * closed before that happens. It returns true if the progress
   * bar has been cancelled.
   */
  updateProgressBarValue(id: number, value: Int64, callback?: (data: boolean)=>void): void;

  /**
   * Update the progress bar's message. This method is lazy;
   * the progress bar message will eventually be updated, unless it is
   * closed before that happens. It returns true if the progress
   * bar has been cancelled.
   */
  updateProgressBarMessage(id: number, message: string): Q.Promise<boolean>;

  /**
   * Update the progress bar's message. This method is lazy;
   * the progress bar message will eventually be updated, unless it is
   * closed before that happens. It returns true if the progress
   * bar has been cancelled.
   */
  updateProgressBarMessage(id: number, message: string, callback?: (data: boolean)=>void): void;

  /**
   * Close the progress bar. This method is lazy; the progress
   * bar will eventually be closed, but there is no guarantee that
   * it has been closed by the time the method returns.
   */
  closeProgressBar(id: number): Q.Promise<void>;

  /**
   * Close the progress bar. This method is lazy; the progress
   * bar will eventually be closed, but there is no guarantee that
   * it has been closed by the time the method returns.
   */
  closeProgressBar(id: number, callback?: (data: void)=>void): void;

  showView(id: string): Q.Promise<void>;

  showView(id: string, callback?: (data: void)=>void): void;

  /**
   * Generic dialog for selecting one element out of a list.
   * 
   * @param title The dialog title.
   * @param message Message string displayed above the elements.
   * @param elements The elements to choose from.
   * @return The index of the selected element, or -1 if the dialog was cancelled.
   */
  openElementSelectionDialog(title: string, message: string, elements: string[]): Q.Promise<number>;

  /**
   * Generic dialog for selecting one element out of a list.
   * 
   * @param title The dialog title.
   * @param message Message string displayed above the elements.
   * @param elements The elements to choose from.
   * @return The index of the selected element, or -1 if the dialog was cancelled.
   */
  openElementSelectionDialog(title: string, message: string, elements: string[], callback?: (data: number)=>void): void;

  /**
   * Generic dialog for selecting multiple elements out of a list.
   */
  openMultipleElementSelectionDialog(title: string, message: string, elements: string[]): Q.Promise<number[]>;

  /**
   * Generic dialog for selecting multiple elements out of a list.
   */
  openMultipleElementSelectionDialog(title: string, message: string, elements: string[], callback?: (data: number[])=>void): void;

  /**
   * Opens the given file in the eclipse editor
   */
  editSourceLocation(loc: SourceLocation): Q.Promise<void>;

  /**
   * Opens the given file in the eclipse editor
   */
  editSourceLocation(loc: SourceLocation, callback?: (data: void)=>void): void;

  /**
   * Resolves the alias for a specified string. The name of the file to be resolved is sent as
   * input and the returning string is the absolute path to the file to be linked with the
   * specified alias id.
   */
  resolveAliasForFile(fileName: string, suggestedFile: string): Q.Promise<string>;

  /**
   * Resolves the alias for a specified string. The name of the file to be resolved is sent as
   * input and the returning string is the absolute path to the file to be linked with the
   * specified alias id.
   */
  resolveAliasForFile(fileName: string, suggestedFile: string, callback?: (data: string)=>void): void;

  /**
   * Resolve the current theme that is used by the client.
   */
  getActiveTheme(): Q.Promise<{ [k: number /*ThriftDisplayElement*/]: ColorSchema; }>;

  /**
   * Resolve the current theme that is used by the client.
   */
  getActiveTheme(callback?: (data: { [k: number /*ThriftDisplayElement*/]: ColorSchema; })=>void): void;
}
