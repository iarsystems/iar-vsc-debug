/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { dialogs } from "./dialogs_types";


/**
 * This is a small service able to evaluate current state of a dialog.
 */
export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  SetValue(itemId: string, items: PropertyTreeItem): Q.Promise<boolean>;

  SetValue(itemId: string, items: PropertyTreeItem, callback?: (data: boolean)=>void): void;

  GetState(itemId: string): Q.Promise<ToolbarItemState>;

  GetState(itemId: string, callback?: (data: ToolbarItemState)=>void): void;
}
