/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { cmsisagent } from "./cmsisagent_types";


export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  loadProject(ewpfile: string, rteConfigFile: string): Q.Promise<void>;

  loadProject(ewpfile: string, rteConfigFile: string, callback?: (data: void)=>void): void;

  createNewProject(ewpfile: string, outputType: OutputType): Q.Promise<void>;

  createNewProject(ewpfile: string, outputType: OutputType, callback?: (data: void)=>void): void;

  shutdown(): Q.Promise<void>;

  shutdown(callback?: (data: void)=>void): void;

  activate(project: string): Q.Promise<void>;

  activate(project: string, callback?: (data: void)=>void): void;

  getComponentInfo(rte: string): Q.Promise<ComponentInfo[]>;

  getComponentInfo(rte: string, callback?: (data: ComponentInfo[])=>void): void;

  getValidationStatus(rte: string): Q.Promise<ValidationStatus[]>;

  getValidationStatus(rte: string, callback?: (data: ValidationStatus[])=>void): void;

  getApis(rte: string): Q.Promise<Api[]>;

  getApis(rte: string, callback?: (data: Api[])=>void): void;

  getDeviceInfo(rte: string): Q.Promise<DeviceInfo>;

  getDeviceInfo(rte: string, callback?: (data: DeviceInfo)=>void): void;

  getPathToPack(packId: string): Q.Promise<string>;

  getPathToPack(packId: string, callback?: (data: string)=>void): void;

  getPackIdFromPath(fileInPack: string): Q.Promise<FileInPack>;

  getPackIdFromPath(fileInPack: string, callback?: (data: FileInPack)=>void): void;

  getRteFiles(projectName: string): Q.Promise<RteFile[]>;

  getRteFiles(projectName: string, callback?: (data: RteFile[])=>void): void;

  openDeviceDialog(projectName: string): Q.Promise<void>;

  openDeviceDialog(projectName: string, callback?: (data: void)=>void): void;
}
