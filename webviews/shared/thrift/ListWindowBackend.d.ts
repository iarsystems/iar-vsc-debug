/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { listwindow } from "./listwindow_types";


export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  connect(listener: ServiceLocation): Q.Promise<void>;

  connect(listener: ServiceLocation, callback?: (data: void)=>void): void;

  disconnect(): Q.Promise<void>;

  disconnect(callback?: (data: void)=>void): void;

  setContentStorageFile(filename: string): Q.Promise<void>;

  setContentStorageFile(filename: string, callback?: (data: void)=>void): void;

  getNumberOfRows(): Q.Promise<Int64>;

  getNumberOfRows(callback?: (data: Int64)=>void): void;

  getRow(index: Int64): Q.Promise<Row>;

  getRow(index: Int64, callback?: (data: Row)=>void): void;

  setVisibleRows(first: Int64, last: Int64): Q.Promise<void>;

  setVisibleRows(first: Int64, last: Int64, callback?: (data: void)=>void): void;

  show(on: boolean): Q.Promise<void>;

  show(on: boolean, callback?: (data: void)=>void): void;

  getColumnInfo(): Q.Promise<Column[]>;

  getColumnInfo(callback?: (data: Column[])=>void): void;

  getListSpec(): Q.Promise<ListSpec>;

  getListSpec(callback?: (data: ListSpec)=>void): void;

  toggleExpansion(index: Int64): Q.Promise<number>;

  toggleExpansion(index: Int64, callback?: (data: number)=>void): void;

  toggleCheckmark(index: Int64): Q.Promise<void>;

  toggleCheckmark(index: Int64, callback?: (data: void)=>void): void;

  getContextMenu(row: Int64, col: number): Q.Promise<MenuItem[]>;

  getContextMenu(row: Int64, col: number, callback?: (data: MenuItem[])=>void): void;

  handleContextMenu(command: number): Q.Promise<void>;

  handleContextMenu(command: number, callback?: (data: void)=>void): void;

  getDisplayName(): Q.Promise<string>;

  getDisplayName(callback?: (data: string)=>void): void;

  scroll(op: ScrollOperation, first: Int64, last: Int64): Q.Promise<Int64>;

  scroll(op: ScrollOperation, first: Int64, last: Int64, callback?: (data: Int64)=>void): void;

  click(row: Int64, col: number, flag: SelectionFlags): Q.Promise<void>;

  click(row: Int64, col: number, flag: SelectionFlags, callback?: (data: void)=>void): void;

  doubleClick(row: Int64, col: number): Q.Promise<void>;

  doubleClick(row: Int64, col: number, callback?: (data: void)=>void): void;

  getEditableString(row: Int64, col: number): Q.Promise<EditInfo>;

  getEditableString(row: Int64, col: number, callback?: (data: EditInfo)=>void): void;

  setValue(row: Int64, col: number, value: string): Q.Promise<boolean>;

  setValue(row: Int64, col: number, value: string, callback?: (data: boolean)=>void): void;

  getSelection(): Q.Promise<SelRange[]>;

  getSelection(callback?: (data: SelRange[])=>void): void;

  getToolTip(row: Int64, col: number, pos: number): Q.Promise<Tooltip>;

  getToolTip(row: Int64, col: number, pos: number, callback?: (data: Tooltip)=>void): void;

  drop(row: Int64, col: number, text: string): Q.Promise<boolean>;

  drop(row: Int64, col: number, text: string, callback?: (data: boolean)=>void): void;

  dropLocal(row: Int64, col: number, text: string, srcRow: Int64, srcCol: number): Q.Promise<boolean>;

  dropLocal(row: Int64, col: number, text: string, srcRow: Int64, srcCol: number, callback?: (data: boolean)=>void): void;

  getDrag(row: Int64, col: number): Q.Promise<Drag>;

  getDrag(row: Int64, col: number, callback?: (data: Drag)=>void): void;

  getHelpTag(): Q.Promise<HelpTag>;

  getHelpTag(callback?: (data: HelpTag)=>void): void;

  columnClick(col: number): Q.Promise<void>;

  columnClick(col: number, callback?: (data: void)=>void): void;

  handleChar(c: number, repeat: number): Q.Promise<void>;

  handleChar(c: number, repeat: number, callback?: (data: void)=>void): void;

  handleKeyDown(c: number, repeat: number, shift: boolean, ctrl: boolean): Q.Promise<void>;

  handleKeyDown(c: number, repeat: number, shift: boolean, ctrl: boolean, callback?: (data: void)=>void): void;

  keyNavigate(op: KeyNavOperation, repeat: number, flags: number, rowsInPage: number): Q.Promise<void>;

  keyNavigate(op: KeyNavOperation, repeat: number, flags: number, rowsInPage: number, callback?: (data: void)=>void): void;

  toggleMoreOrLess(row: Int64): Q.Promise<void>;

  toggleMoreOrLess(row: Int64, callback?: (data: void)=>void): void;

  dropOutsideContent(): Q.Promise<Target>;

  dropOutsideContent(callback?: (data: Target)=>void): void;

  isSliding(): Q.Promise<boolean>;

  isSliding(callback?: (data: boolean)=>void): void;

  getChunkInfo(): Q.Promise<ChunkInfo>;

  getChunkInfo(callback?: (data: ChunkInfo)=>void): void;

  addAfter(minToAdd: number, maxToTrim: number): Q.Promise<AddRowsResult>;

  addAfter(minToAdd: number, maxToTrim: number, callback?: (data: AddRowsResult)=>void): void;

  addBefore(minToAdd: number, maxToTrim: number): Q.Promise<AddRowsResult>;

  addBefore(minToAdd: number, maxToTrim: number, callback?: (data: AddRowsResult)=>void): void;

  navigateToFraction(fraction: number, chunkPos: number, minLines: number): Q.Promise<NavigateResult>;

  navigateToFraction(fraction: number, chunkPos: number, minLines: number, callback?: (data: NavigateResult)=>void): void;

  navigateTo(toWhat: string, chunkPos: number, minLines: number): Q.Promise<NavigateResult>;

  navigateTo(toWhat: string, chunkPos: number, minLines: number, callback?: (data: NavigateResult)=>void): void;

  getSel(): Q.Promise<SelectionResult>;

  getSel(callback?: (data: SelectionResult)=>void): void;

  setSel(row: number): Q.Promise<SelectionResult>;

  setSel(row: number, callback?: (data: SelectionResult)=>void): void;

  keyNav(op: KeyNavOperation, repeat: number, rowsInPage: number): Q.Promise<number>;

  keyNav(op: KeyNavOperation, repeat: number, rowsInPage: number, callback?: (data: number)=>void): void;

  getToolbarDefinition(): Q.Promise<PropertyTreeItem>;

  getToolbarDefinition(callback?: (data: PropertyTreeItem)=>void): void;

  setToolbarItemValue(id: string, tree: PropertyTreeItem): Q.Promise<boolean>;

  setToolbarItemValue(id: string, tree: PropertyTreeItem, callback?: (data: boolean)=>void): void;

  getToolbarItemValue(id: string): Q.Promise<string>;

  getToolbarItemValue(id: string, callback?: (data: string)=>void): void;

  getToolbarItemState(id: string): Q.Promise<ToolbarItemState>;

  getToolbarItemState(id: string, callback?: (data: ToolbarItemState)=>void): void;

  getToolbarItemTooltip(id: string): Q.Promise<string>;

  getToolbarItemTooltip(id: string, callback?: (data: string)=>void): void;
}