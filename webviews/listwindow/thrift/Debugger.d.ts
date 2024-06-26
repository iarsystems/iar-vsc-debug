/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { cspy } from "./cspy_types";


/**
 * Main C-SPY service.
 */
export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  /**
   * Returns the version of the debugger as a string.
   */
  getVersionString(): Q.Promise<string>;

  /**
   * Returns the version of the debugger as a string.
   */
  getVersionString(callback?: (data: string)=>void): void;

  /**
   * Starts a debug session. Normally the very first thing which is
   * invoked in the lifecycle of a debug session. Responsible to
   * prepare the debugger to be able to load a module.
   */
  startSession(sessionConfig: SessionConfiguration): Q.Promise<void>;

  /**
   * Starts a debug session. Normally the very first thing which is
   * invoked in the lifecycle of a debug session. Responsible to
   * prepare the debugger to be able to load a module.
   */
  startSession(sessionConfig: SessionConfiguration, callback?: (data: void)=>void): void;

  /**
   * Stops the debug session. When this method returns, the event
   * kDkDoShutdown should have been triggered.
   * 
   * @deprecated This method should not be called by clients directly. Use <tt>exit()</tt> instead.
   */
  stopSession(): Q.Promise<void>;

  /**
   * Stops the debug session. When this method returns, the event
   * kDkDoShutdown should have been triggered.
   * 
   * @deprecated This method should not be called by clients directly. Use <tt>exit()</tt> instead.
   */
  stopSession(callback?: (data: void)=>void): void;

  /**
   * Get user settings from the EW
   */
  getDebugSettings(): Q.Promise<DebugSettings>;

  /**
   * Get user settings from the EW
   */
  getDebugSettings(callback?: (data: DebugSettings)=>void): void;

  /**
   * Set user settings of the debugger session.
   */
  setDebugSettings(settings: DebugSettings): Q.Promise<void>;

  /**
   * Set user settings of the debugger session.
   */
  setDebugSettings(settings: DebugSettings, callback?: (data: void)=>void): void;

  /**
   * Cause CSpyServer to terminate. Will call stopSession() if necessary.
   * <p>Note: we currently do not support calling startSession() again after
   * stopSession(), e.g. there can only be a single "start - stop - exit" cycle
   * per process. This is due to limitations in the semantics of dlclose()
   * on POSIX system. stopSession() is thus deprecated and should not be called
   * directly from clients.
   */
  exit(): Q.Promise<void>;

  /**
   * Cause CSpyServer to terminate. Will call stopSession() if necessary.
   * <p>Note: we currently do not support calling startSession() again after
   * stopSession(), e.g. there can only be a single "start - stop - exit" cycle
   * per process. This is due to limitations in the semantics of dlclose()
   * on POSIX system. stopSession() is thus deprecated and should not be called
   * directly from clients.
   */
  exit(callback?: (data: void)=>void): void;

  /**
   * Returns true if the debugger is "online", i.e. has a program loaded
   * and can be expected to receive commands. This is roughly defined as
   * between kDkLoadModule and kDkDoShutdown. Note that this can only be
   * an approximation, as the state of the debugger may change between
   * checking this flag and acting on it. It should only be used to provide
   * hints to the user such as UI element state.
   */
  isOnline(): Q.Promise<boolean>;

  /**
   * Returns true if the debugger is "online", i.e. has a program loaded
   * and can be expected to receive commands. This is roughly defined as
   * between kDkLoadModule and kDkDoShutdown. Note that this can only be
   * an approximation, as the state of the debugger may change between
   * checking this flag and acting on it. It should only be used to provide
   * hints to the user such as UI element state.
   */
  isOnline(callback?: (data: boolean)=>void): void;

  /**
   * Loads a module. See loadModuleWithOptions.
   */
  loadModule(filename: string): Q.Promise<void>;

  /**
   * Loads a module. See loadModuleWithOptions.
   */
  loadModule(filename: string, callback?: (data: void)=>void): void;

  /**
   * Loads a module with additional loading options.
   */
  loadModuleWithOptions(filename: string, options: ModuleLoadingOptions): Q.Promise<void>;

  /**
   * Loads a module with additional loading options.
   */
  loadModuleWithOptions(filename: string, options: ModuleLoadingOptions, callback?: (data: void)=>void): void;

  /**
   * Performs flashloading.
   * <p>TODO flashloading should be hidden behind loadModule().
   * TODO the executable and arguments parameters are unused
   * (leftovers from the old CDP-based debugger API?)
   */
  flashModule(boardFile: string, executable: string, argument_list: string[], extraExecutables: string[]): Q.Promise<void>;

  /**
   * Performs flashloading.
   * <p>TODO flashloading should be hidden behind loadModule().
   * TODO the executable and arguments parameters are unused
   * (leftovers from the old CDP-based debugger API?)
   */
  flashModule(boardFile: string, executable: string, argument_list: string[], extraExecutables: string[], callback?: (data: void)=>void): void;

  /**
   * Returns a list of the passes
   */
  getFlashPasses(boardFile: string): Q.Promise<string[][]>;

  /**
   * Returns a list of the passes
   */
  getFlashPasses(boardFile: string, callback?: (data: string[][])=>void): void;

  /**
   * Erase the flash memory
   */
  eraseFlash(boardFile: string, nPasses: boolean[]): Q.Promise<void>;

  /**
   * Erase the flash memory
   */
  eraseFlash(boardFile: string, nPasses: boolean[], callback?: (data: void)=>void): void;

  /**
   * Return a list of all loaded modules
   */
  getModules(): Q.Promise<ModuleData[]>;

  /**
   * Return a list of all loaded modules
   */
  getModules(callback?: (data: ModuleData[])=>void): void;

  /**
   * Loads a macrofile.
   */
  loadMacroFile(macro: string): Q.Promise<void>;

  /**
   * Loads a macrofile.
   */
  loadMacroFile(macro: string, callback?: (data: void)=>void): void;

  /**
   * Unload a macrofile
   */
  unloadMacroFile(macro: string): Q.Promise<void>;

  /**
   * Unload a macrofile
   */
  unloadMacroFile(macro: string, callback?: (data: void)=>void): void;

  runToULE(ule: string, allowSingleStep: boolean): Q.Promise<void>;

  runToULE(ule: string, allowSingleStep: boolean, callback?: (data: void)=>void): void;

  /**
   * Get the current state of the multicore settings.
   */
  getMulticoreFlags(): Q.Promise<Int64>;

  /**
   * Get the current state of the multicore settings.
   */
  getMulticoreFlags(callback?: (data: Int64)=>void): void;

  /**
   * Return a list of available "threads". These may or may not be
   * actual threads. They correspond roughly to available
   * "base contexts", or "threads" as present in the Eclipse debug view.
   * TODO move to RTOS service
   */
  getThreadList(): Q.Promise<Thread[]>;

  /**
   * Return a list of available "threads". These may or may not be
   * actual threads. They correspond roughly to available
   * "base contexts", or "threads" as present in the Eclipse debug view.
   * TODO move to RTOS service
   */
  getThreadList(callback?: (data: Thread[])=>void): void;

  /**
   * Check if the given thread is the active thread or not.
   */
  isActiveThread(t: Thread): Q.Promise<boolean>;

  /**
   * Check if the given thread is the active thread or not.
   */
  isActiveThread(t: Thread, callback?: (data: boolean)=>void): void;

  /**
   *  Each expression has a root expression which is always a string. Subexpressions are then referred to as a list of indexes
   * (instead of the perhaps more intuitive list of subexpression names).
   * 
   * <tt>
   *   struct A {
   *       int x;
   *       int y;
   *   };
   * 
   *   struct B {
   *     struct A a[10];
   *   };
   * 
   *   struct B b;
   * </tt>
   * 
   * In this example, the expression b.a[5].y would be represented using rootExpr = "b", and subExprIndex = [0, 5, 1],
   * where 0 is the index of a (since it is the first member of struct B), 5 is the array index, and 1 is the index of y
   * which is the second member of struct A.
   *   
   * When evaluating expressions, you pass the root expression and the list of indexes to obtain a ExprValue object,
   * which contains the value of the expression (as a string, according to the requested format). Also the ExprValue object
   * will tell you if there are any subexpressions and if so, how many.
   * 
   * If prefix is true, the formatted value will be given a prefix appropriate
   * the specified format.
   * 
   */
  evalExpression(ref: ContextRef, expr: string, subExprIndex: number[], format: ExprFormat, prefix: boolean): Q.Promise<ExprValue>;

  /**
   *  Each expression has a root expression which is always a string. Subexpressions are then referred to as a list of indexes
   * (instead of the perhaps more intuitive list of subexpression names).
   * 
   * <tt>
   *   struct A {
   *       int x;
   *       int y;
   *   };
   * 
   *   struct B {
   *     struct A a[10];
   *   };
   * 
   *   struct B b;
   * </tt>
   * 
   * In this example, the expression b.a[5].y would be represented using rootExpr = "b", and subExprIndex = [0, 5, 1],
   * where 0 is the index of a (since it is the first member of struct B), 5 is the array index, and 1 is the index of y
   * which is the second member of struct A.
   *   
   * When evaluating expressions, you pass the root expression and the list of indexes to obtain a ExprValue object,
   * which contains the value of the expression (as a string, according to the requested format). Also the ExprValue object
   * will tell you if there are any subexpressions and if so, how many.
   * 
   * If prefix is true, the formatted value will be given a prefix appropriate
   * the specified format.
   * 
   */
  evalExpression(ref: ContextRef, expr: string, subExprIndex: number[], format: ExprFormat, prefix: boolean, callback?: (data: ExprValue)=>void): void;

  assignExpression(ref: ContextRef, expr: string, subExprIndex: number[], rvalue: ExprValue): Q.Promise<void>;

  assignExpression(ref: ContextRef, expr: string, subExprIndex: number[], rvalue: ExprValue, callback?: (data: void)=>void): void;

  /**
   * Returns a list of sub-expression labels.
   * Labels are for display to the user, and may be created by custom data structure
   * visualisations introduced via custom_formats.dat
   * 
   * treatPointerAsArray is a new field used to implement support for "Display as array",
   * see ECL-2592.
   */
  getSubExpressionLabels(ref: ContextRef, rootExpr: string, subExprIndex: number[], startIndex: number, length: number, treatPointerAsArray: boolean): Q.Promise<string[]>;

  /**
   * Returns a list of sub-expression labels.
   * Labels are for display to the user, and may be created by custom data structure
   * visualisations introduced via custom_formats.dat
   * 
   * treatPointerAsArray is a new field used to implement support for "Display as array",
   * see ECL-2592.
   */
  getSubExpressionLabels(ref: ContextRef, rootExpr: string, subExprIndex: number[], startIndex: number, length: number, treatPointerAsArray: boolean, callback?: (data: string[])=>void): void;

  /**
   * Return a list of all location names (e.g. registers)
   */
  getLocationNames(): Q.Promise<string[]>;

  /**
   * Return a list of all location names (e.g. registers)
   */
  getLocationNames(callback?: (data: string[])=>void): void;

  /**
   * Return a list of all location names in the given group
   */
  getLocationNamesInGroup(group: string): Q.Promise<string[]>;

  /**
   * Return a list of all location names in the given group
   */
  getLocationNamesInGroup(group: string, callback?: (data: string[])=>void): void;

  /**
   * Return a list of all register groups
   */
  getRegisterGroups(): Q.Promise<string[]>;

  /**
   * Return a list of all register groups
   */
  getRegisterGroups(callback?: (data: string[])=>void): void;

  /**
   * Return information about a specific named location
   * Throws exception if no such location could be found.
   */
  getNamedLocation(name: string): Q.Promise<NamedLocation>;

  /**
   * Return information about a specific named location
   * Throws exception if no such location could be found.
   */
  getNamedLocation(name: string, callback?: (data: NamedLocation)=>void): void;

  getCoreState(core: number): Q.Promise<DkCoreStatusConstants>;

  getCoreState(core: number, callback?: (data: DkCoreStatusConstants)=>void): void;

  getNumberOfCores(): Q.Promise<number>;

  getNumberOfCores(callback?: (data: number)=>void): void;

  getCoreDescription(core: number): Q.Promise<string>;

  getCoreDescription(core: number, callback?: (data: string)=>void): void;

  getCycleCounter(core: number): Q.Promise<Int64>;

  getCycleCounter(core: number, callback?: (data: Int64)=>void): void;

  getCyclesPerSecond(): Q.Promise<Int64>;

  getCyclesPerSecond(callback?: (data: Int64)=>void): void;

  hasCoreStoppedDeliberately(core: number): Q.Promise<boolean>;

  hasCoreStoppedDeliberately(core: number, callback?: (data: boolean)=>void): void;

  setResetStyles(id: number): Q.Promise<void>;

  setResetStyles(id: number, callback?: (data: void)=>void): void;

  getResetStyles(): Q.Promise<ResetStyles[]>;

  getResetStyles(callback?: (data: ResetStyles[])=>void): void;

  reset(): Q.Promise<void>;

  reset(callback?: (data: void)=>void): void;

  go(): Q.Promise<void>;

  go(callback?: (data: void)=>void): void;

  goCore(core: number): Q.Promise<void>;

  goCore(core: number, callback?: (data: void)=>void): void;

  stop(): Q.Promise<void>;

  stop(callback?: (data: void)=>void): void;

  stopCore(core: number): Q.Promise<void>;

  stopCore(core: number, callback?: (data: void)=>void): void;

  multiGo(core: number): Q.Promise<void>;

  multiGo(core: number, callback?: (data: void)=>void): void;

  step(enterFunctionsWithoutSource: boolean): Q.Promise<void>;

  step(enterFunctionsWithoutSource: boolean, callback?: (data: void)=>void): void;

  stepOver(enterFunctionsWithoutSource: boolean): Q.Promise<void>;

  stepOver(enterFunctionsWithoutSource: boolean, callback?: (data: void)=>void): void;

  nextStatement(enterFunctionsWithoutSource: boolean): Q.Promise<void>;

  nextStatement(enterFunctionsWithoutSource: boolean, callback?: (data: void)=>void): void;

  stepOut(): Q.Promise<void>;

  stepOut(callback?: (data: void)=>void): void;

  instructionStep(): Q.Promise<void>;

  instructionStep(callback?: (data: void)=>void): void;

  instructionStepOver(): Q.Promise<void>;

  instructionStepOver(callback?: (data: void)=>void): void;

  goToLocation(location: Location): Q.Promise<void>;

  goToLocation(location: Location, callback?: (data: void)=>void): void;

  goToLocations(locations: Location[]): Q.Promise<void>;

  goToLocations(locations: Location[], callback?: (data: void)=>void): void;

  supportsExceptions(): Q.Promise<boolean>;

  supportsExceptions(callback?: (data: boolean)=>void): void;

  getBreakOnThrow(): Q.Promise<boolean>;

  getBreakOnThrow(callback?: (data: boolean)=>void): void;

  setBreakOnThrow(enable: boolean): Q.Promise<void>;

  setBreakOnThrow(enable: boolean, callback?: (data: void)=>void): void;

  getBreakOnUncaughtException(): Q.Promise<boolean>;

  getBreakOnUncaughtException(callback?: (data: boolean)=>void): void;

  setBreakOnUncaughtException(enable: boolean): Q.Promise<void>;

  setBreakOnUncaughtException(enable: boolean, callback?: (data: void)=>void): void;

  getZoneByName(name: string): Q.Promise<ZoneInfo>;

  getZoneByName(name: string, callback?: (data: ZoneInfo)=>void): void;

  getZoneById(id: number): Q.Promise<ZoneInfo>;

  getZoneById(id: number, callback?: (data: ZoneInfo)=>void): void;

  getAllZones(): Q.Promise<ZoneInfo[]>;

  getAllZones(callback?: (data: ZoneInfo[])=>void): void;

  /**
   * Returns the current trace timestamp used by the IfTraceUtil.cpp
   * trace functions. This is used to allow e.g. Eclipse to synchronize
   * trace streams.
   */
  getTraceTime(): Q.Promise<Int64>;

  /**
   * Returns the current trace timestamp used by the IfTraceUtil.cpp
   * trace functions. This is used to allow e.g. Eclipse to synchronize
   * trace streams.
   */
  getTraceTime(callback?: (data: Int64)=>void): void;
}
