//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');


/**
 * The list of all notifications. This is copy-pasted from
 * DkNotifyApi.h.
 */
export declare enum DkNotifyConstant {
  kDkTargetStopped = 0,
  kDkTargetStarted = 1,
  kDkReset = 2,
  kDkMemoryChanged = 3,
  kDkInspectionContextChanged = 4,
  kDkBaseContextChanged = 5,
  kDkPreLoadModule = 6,
  kDkPostLoadModule = 7,
  kDkPostLoadPrefixModul = 8,
  kDkUserBreakUpdate = 9,
  kDkPostConfig = 10,
  kDkPreShutDown = 11,
  kDkDoShutDown = 12,
  kDkFatalError = 13,
  kDkDriverReset = 14,
  kDkForceUpdate = 15,
  kDkPreModify = 16,
  kDkForcedStop = 17,
  kDkStopRequested = 18,
  kDkSilentFatalError = 19,
  kDkPrePreShutDown = 20,
  kDkPostLoadExtraModule = 21,
  kDkKernelThreadStarted = 22,
  kDkKernelThreadExiting = 23,
  kDkMetaDataChanged = 24,
  kDkPreLoadPlugin = 25,
  kDkPostLoadPlugin = 26,
  kDkPreUnloadPlugin = 27,
  kDkPostUnloadPlugin = 28,
  kDkServicesChanged = 29,
  kDkFinishedStaticInit = 30,
  kDkCoreStopped = 31,
  kDkCoreStarted = 32,
}

/**
 * Thrift-variant of DkCoreStatus.
 */
export declare enum DkCoreStatusConstants {
  kDkCoreStateStopped = 0,
  kDkCoreStateRunning = 1,
  kDkCoreStateSleeping = 2,
  kDkCoreStateUnknown = 3,
  kDkCoreStateNoPower = 4,
}

/**
 * See DkLoggingCategory in DkLogApi.h.
 * 
 * Note that the enum value should be relied upon. To convert to
 * and from the DkLoggingCategory constants, use the convert() functions
 * in CSpyTypeConverters.h.
 */
export declare enum DkLoggingCategoryConstant {
  kDkLogUser = 0,
  kDkLogInfo = 1,
  kDkLogWarning = 2,
  kDkLogError = 3,
  kDkLogMinorInfo = 4,
}

/**
 * This is used by the UI to determine how to present the value of
 * an expression. It does not, for example, provide enough information in
 * order to be able to evaluate an expression.
 */
export declare enum BasicExprType {
  Unknown = 0,
  Basic = 1,
  Pointer = 2,
  Array = 3,
  Composite = 4,
  Enumeration = 5,
  Function = 6,
  Custom = 7,
}

/**
 * Configuration information needed to start a debug session.
 * 
 * This contains all information necessary to start a debug session, including
 * information about which plugins to load, etc.
 * 
 * This corresponds roughly to ICSpyConfiguration in Eclipse.
 */
export declare class SessionConfiguration {
  type: string;
  driverName: string;
  processorName: string;
  options: string[];
  executable: string;
  toolkitDir: string;
  target: string;
  projectName: string;
  projectDir: string;
  stackSettings: StackSettings;
  setupMacros: string[];
  plugins: string[];
  configName: string;
  enableCRun: boolean;
  attachToTarget: boolean;
  leaveRunning: boolean;

    constructor(args?: { type: string; driverName: string; processorName: string; options: string[]; executable: string; toolkitDir: string; target: string; projectName: string; projectDir: string; stackSettings: StackSettings; setupMacros: string[]; plugins: string[]; configName: string; enableCRun: boolean; attachToTarget: boolean; leaveRunning: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Sent to the debug-event listener service when a debug event
 * happens. See DkNotifyApi.h.
 */
export declare class DebugEvent {
  note: DkNotifyConstant;
  descr: string;
  params: string[];

    constructor(args?: { note: DkNotifyConstant; descr: string; params: string[]; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * See kDkInspectionContextChanged. This is its own struct since we
 * want to send a context ref with it (with the generic DebugEvent
 * we can only send a description and string parameters).
 */
export declare class InspectionContextChangedEvent {
  context: ContextRef;

    constructor(args?: { context: ContextRef; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * See kDkBaseContextChanged. Also, see comment above on
 * why this is a separate struct.
 */
export declare class BaseContextChangedEvent {
  context: ContextRef;

    constructor(args?: { context: ContextRef; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Sent to the debug event listener when a log event happens.
 */
export declare class LogEvent {
  cat: DkLoggingCategoryConstant;
  text: string;
  timestamp: Int64;

    constructor(args?: { cat: DkLoggingCategoryConstant; text: string; timestamp: Int64; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Information about a thread (or an RTOS task).
 */
export declare class Thread {
  id: number;
  name: string;

    constructor(args?: { id: number; name: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ExprValue {
  expression: string;
  value: string;
  type: string;
  isLValue: boolean;
  hasLocation: boolean;
  location: Location;
  subExprCount: number;
  basicType: BasicExprType;
  size: number;

    constructor(args?: { expression: string; value: string; type: string; isLValue: boolean; hasLocation: boolean; location: Location; subExprCount: number; basicType: BasicExprType; size: number; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Information about a loaded module.
 */
export declare class ModuleData {
  name: string;
  file: string;
  timestamp: Int64;
  baseAddress: string;
  toAddress: string;
  symbolsAreLoaded: boolean;
  size: Int64;

    constructor(args?: { name: string; file: string; timestamp: Int64; baseAddress: string; toAddress: string; symbolsAreLoaded: boolean; size: Int64; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class NamedLocationMask {
  used: boolean;
  shift: number;
  mask: Int64;

    constructor(args?: { used: boolean; shift: number; mask: Int64; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class NamedLocation {
  name: string;
  nameAlias: string;
  readonly: boolean;
  writeonly: boolean;
  location: Location;
  realLocation: Location;
  valueBitSize: number;
  fullBitSize: number;
  defaultBase: number;
  usesMask: boolean;
  masks: NamedLocationMask[];
  description: string;

    constructor(args?: { name: string; nameAlias: string; readonly: boolean; writeonly: boolean; location: Location; realLocation: Location; valueBitSize: number; fullBitSize: number; defaultBase: number; usesMask: boolean; masks: NamedLocationMask[]; description: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ExtraDebugFile {
  doDownload: boolean;
  path: string;
  offset: Int64;

    constructor(args?: { doDownload: boolean; path: string; offset: Int64; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ModuleLoadingOptions {
  resetAfterLoad: boolean;
  callUserMacros: boolean;
  onlyPrefixNotation: boolean;
  suppressDownload: boolean;
  shouldAttach: boolean;
  shouldLeaveRunning: boolean;
  extraDebugFiles: ExtraDebugFile[];

    constructor(args?: { resetAfterLoad: boolean; callUserMacros: boolean; onlyPrefixNotation: boolean; suppressDownload: boolean; shouldAttach: boolean; shouldLeaveRunning: boolean; extraDebugFiles: ExtraDebugFile[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ResetStyles {
  name: string;
  id: number;
  selected: boolean;
  tooltip: string;

    constructor(args?: { name: string; id: number; selected: boolean; tooltip: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class DebugSettings {
  alwaysPickAllInstances: boolean;
  enterFunctionsWithoutSource: boolean;
  stlDepth: number;
  staticWatchUpdateInterval: number;
  memoryWindowUpdateInterval: number;
  globalIntegerFormat: number;

    constructor(args?: { alwaysPickAllInstances: boolean; enterFunctionsWithoutSource: boolean; stlDepth: number; staticWatchUpdateInterval: number; memoryWindowUpdateInterval: number; globalIntegerFormat: number; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * The unique identifier for the Debugger service
 */
export declare var DEBUGGER_SERVICE: string;

/**
 * The unique identifier for the Debugger Event Handler service
 */
export declare var DEBUGEVENT_SERVICE: string;

/**
 * The unique identifier for the Context Manager service
 */
export declare var CONTEXT_MANAGER_SERVICE: string;

/**
 * The unique identifier for the Memory service
 */
export declare var MEMORY_SERVICE: string;
