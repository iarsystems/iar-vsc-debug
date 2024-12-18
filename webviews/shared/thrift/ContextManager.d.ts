/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { cspy } from "./cspy_types";


/**
 * Handles contexts and call stack functionality.
 */
export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  /**
   * Set the current inspection context. This is invoked for example when
   * the user selects a stack frame in the Eclipse debug view.
   */
  setInspectionContext(context: ContextRef): Q.Promise<void>;

  /**
   * Set the current inspection context. This is invoked for example when
   * the user selects a stack frame in the Eclipse debug view.
   */
  setInspectionContext(context: ContextRef, callback?: (data: void)=>void): void;

  /**
   * Try to locate the given context. This can be used to e.g. find
   * what the "current inspection context" is looking at. This works
   * by first converting the incoming context ref into a DkContext,
   * and then convert that DkContext back into a context ref. This
   * means that if e.g. the current inspection context does not
   * refer to any known context, this method will return a "Unknown"
   * context.
   * 
   * <p>NOTE: The C-SPY implementation of this method is fundamentally broken,
   * and calling this method will cause an unconditional exception to
   * be thrown. See ECL-2260 for more info. /JesperEs 2018-04-18
   */
  findContext(context: ContextRef): Q.Promise<ContextRef>;

  /**
   * Try to locate the given context. This can be used to e.g. find
   * what the "current inspection context" is looking at. This works
   * by first converting the incoming context ref into a DkContext,
   * and then convert that DkContext back into a context ref. This
   * means that if e.g. the current inspection context does not
   * refer to any known context, this method will return a "Unknown"
   * context.
   * 
   * <p>NOTE: The C-SPY implementation of this method is fundamentally broken,
   * and calling this method will cause an unconditional exception to
   * be thrown. See ECL-2260 for more info. /JesperEs 2018-04-18
   */
  findContext(context: ContextRef, callback?: (data: ContextRef)=>void): void;

  /**
   * Get the call stack of the given context.
   */
  getStack(context: ContextRef, low: number, high: number): Q.Promise<ContextInfo[]>;

  /**
   * Get the call stack of the given context.
   */
  getStack(context: ContextRef, low: number, high: number, callback?: (data: ContextInfo[])=>void): void;

  getStackDepth(context: ContextRef, maxDepth: number): Q.Promise<number>;

  getStackDepth(context: ContextRef, maxDepth: number, callback?: (data: number)=>void): void;

  /**
   * Return information about a context, such as source ranges and function name.
   */
  getContextInfo(context: ContextRef): Q.Promise<ContextInfo>;

  /**
   * Return information about a context, such as source ranges and function name.
   */
  getContextInfo(context: ContextRef, callback?: (data: ContextInfo)=>void): void;

  /**
   * Compare two context refs for equality.
   */
  compareContexts(ctx1: ContextRef, ctx2: ContextRef): Q.Promise<boolean>;

  /**
   * Compare two context refs for equality.
   */
  compareContexts(ctx1: ContextRef, ctx2: ContextRef, callback?: (data: boolean)=>void): void;

  getLocals(ctx: ContextRef): Q.Promise<Symbol[]>;

  getLocals(ctx: ContextRef, callback?: (data: Symbol[])=>void): void;

  getParameters(ctx: ContextRef): Q.Promise<Symbol[]>;

  getParameters(ctx: ContextRef, callback?: (data: Symbol[])=>void): void;

  isExecuting(ctx: ContextRef): Q.Promise<boolean>;

  isExecuting(ctx: ContextRef, callback?: (data: boolean)=>void): void;

  setExecLocation(ctx: ContextRef, ule: string): Q.Promise<void>;

  setExecLocation(ctx: ContextRef, ule: string, callback?: (data: void)=>void): void;
}
