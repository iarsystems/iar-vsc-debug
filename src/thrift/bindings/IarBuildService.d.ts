//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import thrift = require('thrift');
import Thrift = thrift.Thrift;
import Q = thrift.Q;
import Int64 = require('node-int64');
import shared_ttypes = require('./shared_types');


import ttypes = require('./iarbuild_types');
import NodeType = ttypes.NodeType
import ContextType = ttypes.ContextType
import BuildResult = ttypes.BuildResult
import LogSeverity = ttypes.LogSeverity
import IARBUILD_SERVICE_NAME = ttypes.IARBUILD_SERVICE_NAME
import IARBUILD_EVENTLISTENER_SERVICE_NAME = ttypes.IARBUILD_EVENTLISTENER_SERVICE_NAME
import Node = ttypes.Node
import Context = ttypes.Context
import LogEntry = ttypes.LogEntry
import PreprocessorMacro = ttypes.PreprocessorMacro
import ScannerInfo = ttypes.ScannerInfo

declare class Client {
  #output: thrift.TTransport;
  #pClass: thrift.TProtocol;
  #_seqid: number;

  constructor(output: thrift.TTransport, pClass: { new(trans: thrift.TTransport): thrift.TProtocol });

  build(config: string, rebuild: boolean): Q.Promise<BuildResult>;

  build(config: string, rebuild: boolean, callback?: (error: void, response: BuildResult)=>void): void;

  clean(config: string): Q.Promise<BuildResult>;

  clean(config: string, callback?: (error: void, response: BuildResult)=>void): void;

  getRootNode(): Q.Promise<Node>;

  getRootNode(callback?: (error: void, response: Node)=>void): void;

  getConfigurations(): Q.Promise<string[]>;

  getConfigurations(callback?: (error: void, response: string[])=>void): void;

  getCategories(configName: string, path: string): Q.Promise<string[]>;

  getCategories(configName: string, path: string, callback?: (error: void, response: string[])=>void): void;

  getAllOptions(configName: string): Q.Promise<string[]>;

  getAllOptions(configName: string, callback?: (error: void, response: string[])=>void): void;

  getOptionState(configName: string, context: Context, optionName: string): Q.Promise<string[]>;

  getOptionState(configName: string, context: Context, optionName: string, callback?: (error: void, response: string[])=>void): void;

  setOptionState(configName: string, context: Context, optionName: string, state: string[]): Q.Promise<void>;

  setOptionState(configName: string, context: Context, optionName: string, state: string[], callback?: (error: void, response: void)=>void): void;

  getScannerInfo(configName: string, nodePath: string[]): Q.Promise<ScannerInfo>;

  getScannerInfo(configName: string, nodePath: string[], callback?: (error: void, response: ScannerInfo)=>void): void;

  shutdown(): Q.Promise<void>;

  shutdown(callback?: (error: void, response: void)=>void): void;

  abort(): Q.Promise<void>;

  abort(callback?: (error: void, response: void)=>void): void;
}

declare class Processor {
  #_handler: object;

  constructor(handler: object);
  process(input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_build(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_clean(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_getRootNode(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_getConfigurations(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_getCategories(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_getAllOptions(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_getOptionState(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_setOptionState(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_getScannerInfo(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_shutdown(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
  process_abort(seqid: number, input: thrift.TProtocol, output: thrift.TProtocol): void;
}
