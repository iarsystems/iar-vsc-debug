/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { disassembly } from "./disassembly_types";


/**
 * The Disassembly service retrieves assembler instructions for a specific memory range
 */
export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  /**
   * Retrieve a list of disassembled instructions for a specific memory range.
   */
  disassembleRange(_from: Location, _to: Location, context: ContextRef): Q.Promise<DisassembledLocation[]>;

  /**
   * Retrieve a list of disassembled instructions for a specific memory range.
   */
  disassembleRange(_from: Location, _to: Location, context: ContextRef, callback?: (data: DisassembledLocation[])=>void): void;

  /**
   * This method is currently not implemented and will fail if called.
   */
  disassembleLines(_from: Location, numLines: number, context: ContextRef): Q.Promise<DisassembledLocation[]>;

  /**
   * This method is currently not implemented and will fail if called.
   */
  disassembleLines(_from: Location, numLines: number, context: ContextRef, callback?: (data: DisassembledLocation[])=>void): void;
}
