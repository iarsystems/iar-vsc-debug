/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { codecoverage } from "./codecoverage_types";


export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  getSessionId(): Q.Promise<Int64>;

  getSessionId(callback?: (data: Int64)=>void): void;

  enable(enable: boolean): Q.Promise<boolean>;

  enable(enable: boolean, callback?: (data: boolean)=>void): void;

  isEnabled(): Q.Promise<boolean>;

  isEnabled(callback?: (data: boolean)=>void): void;

  hasMetaDataSupport(): Q.Promise<boolean>;

  hasMetaDataSupport(callback?: (data: boolean)=>void): void;

  clearCachedData(): Q.Promise<void>;

  clearCachedData(callback?: (data: void)=>void): void;

  isInitialized(): Q.Promise<boolean>;

  isInitialized(callback?: (data: boolean)=>void): void;

  initializeMetaData(): Q.Promise<void>;

  initializeMetaData(callback?: (data: void)=>void): void;

  reinitMetaData(): Q.Promise<boolean>;

  reinitMetaData(callback?: (data: boolean)=>void): void;

  refreshMetaData(): Q.Promise<void>;

  refreshMetaData(callback?: (data: void)=>void): void;

  getXMLData(): Q.Promise<string>;

  getXMLData(callback?: (data: string)=>void): void;
}
