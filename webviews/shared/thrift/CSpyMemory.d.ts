//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { memory } from "./memory_types";


export declare class Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  readMemory(location: Location, wordsize: number, bitsize: number, count: number): Q.Promise<string>;

  readMemory(location: Location, wordsize: number, bitsize: number, count: number, callback?: (data: string)=>void): void;

  readMemoryBlock(location: Location, wordsize: number, bitsize: number, count: number): Q.Promise<CSpyMemoryBlock>;

  readMemoryBlock(location: Location, wordsize: number, bitsize: number, count: number, callback?: (data: CSpyMemoryBlock)=>void): void;

  writeMemory(location: Location, wordsize: number, bitsize: number, count: number, buf: string): Q.Promise<void>;

  writeMemory(location: Location, wordsize: number, bitsize: number, count: number, buf: string, callback?: (data: void)=>void): void;
}
