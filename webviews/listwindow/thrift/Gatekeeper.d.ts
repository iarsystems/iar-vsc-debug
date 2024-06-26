/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { ampsync } from "./ampsync_types";


export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  SetRunAllCores(all: boolean): Q.Promise<void>;

  SetRunAllCores(all: boolean, callback?: (data: void)=>void): void;

  SetStartOneStartsAll(on: boolean): Q.Promise<void>;

  SetStartOneStartsAll(on: boolean, callback?: (data: void)=>void): void;

  SetSoftCTI(on: boolean): Q.Promise<void>;

  SetSoftCTI(on: boolean, callback?: (data: void)=>void): void;

  BeforeLowLevelGo(core: number, multi: boolean): Q.Promise<LowLevelAction>;

  BeforeLowLevelGo(core: number, multi: boolean, callback?: (data: LowLevelAction)=>void): void;

  StartedCPU(core: number): Q.Promise<void>;

  StartedCPU(core: number, callback?: (data: void)=>void): void;

  CPUStoped(core: number): Q.Promise<void>;

  CPUStoped(core: number, callback?: (data: void)=>void): void;

  IsTargetStopped(): Q.Promise<boolean>;

  IsTargetStopped(callback?: (data: boolean)=>void): void;

  AfterLowLevelGo(core: number, code: CoreLowLevelResult): Q.Promise<WhatNext>;

  AfterLowLevelGo(core: number, code: CoreLowLevelResult, callback?: (data: WhatNext)=>void): void;

  Reset(): Q.Promise<void>;

  Reset(callback?: (data: void)=>void): void;

  StopAll(): Q.Promise<void>;

  StopAll(callback?: (data: void)=>void): void;

  SpontaneousCoreStatusChange(core: number, status: CoreStatus): Q.Promise<void>;

  SpontaneousCoreStatusChange(core: number, status: CoreStatus, callback?: (data: void)=>void): void;

  GetCoreStatus(core: number): Q.Promise<CoreStatus>;

  GetCoreStatus(core: number, callback?: (data: CoreStatus)=>void): void;

  IsItOkToStopCore(core: number): Q.Promise<boolean>;

  IsItOkToStopCore(core: number, callback?: (data: boolean)=>void): void;

  SetCPUStatusPolling(on: boolean): Q.Promise<void>;

  SetCPUStatusPolling(on: boolean, callback?: (data: void)=>void): void;

  AckCPUStatusPolling(coreCount: number): Q.Promise<void>;

  AckCPUStatusPolling(coreCount: number, callback?: (data: void)=>void): void;
}
