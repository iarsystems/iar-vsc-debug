//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');
import { Thrift } from 'thrift';

/**
 * See DcResult in CoreUtil/include/DcCommon.h
 */
export declare enum DcResultConstant {
  kDcOk = 0,
  kDcRequestedStop = 1,
  kDcOtherStop = 2,
  kDcUnconditionalStop = 3,
  kDcSympatheticStop = 4,
  kDcBusy = 5,
  kDcError = 6,
  kDcFatalError = 7,
  kDcLicenseViolation = 8,
  kDcSilentFatalError = 9,
  kDcFailure = 10,
  kDcDllLoadLibFailed = 11,
  kDcDllFuncNotFound = 12,
  kDcDllFuncSlotEmpty = 13,
  kDcDllVersionMismatch = 14,
  kDcUnavailable = 15,
}

export declare enum ExprFormat {
  kDefault = 0,
  kBin = 1,
  kOct = 2,
  kDec = 3,
  kHex = 4,
  kChar = 5,
  kStr = 6,
  kNoCustom = 7,
}

export declare enum ContextType {
  CurrentBase = 0,
  CurrentInspection = 1,
  Stack = 2,
  Target = 3,
  Task = 4,
  Unknown = 5,
}

/**
 * Breakpoint access types.
 */
export declare enum AccessType {
  kDkFetchAccess = 1,
  kDkReadAccess = 2,
  kDkWriteAccess = 3,
  kDkReadWriteAccess = 4,
}

/**
 * General exception throw when things go wrong in the debugger.
 */
export declare class CSpyException extends Thrift.TException {
  code: DcResultConstant;
  method: string;
  message: string;
  culprit: string;

    constructor(args?: { code: DcResultConstant; method: string; message: string; culprit: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class Id {
  value: string;
  type: string;

    constructor(args?: { value: string; type: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class Success {
  value: boolean;
  failureMessage: string;

    constructor(args?: { value: boolean; failureMessage: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class Zone {
  id: number;

    constructor(args?: { id: number; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ZoneInfo {
  id: number;
  name: string;
  minAddress: Int64;
  maxAddress: Int64;
  isRegular: boolean;
  isVisible: boolean;
  isBigEndian: boolean;
  bitsPerUnit: number;
  bytesPerUnit: number;

    constructor(args?: { id: number; name: string; minAddress: Int64; maxAddress: Int64; isRegular: boolean; isVisible: boolean; isBigEndian: boolean; bitsPerUnit: number; bytesPerUnit: number; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class Location {
  zone: Zone;
  address: Int64;

    constructor(args?: { zone: Zone; address: Int64; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class SourceLocation {
  filename: string;
  line: number;
  col: number;
  locations: Location[];

    constructor(args?: { filename: string; line: number; col: number; locations: Location[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class SourceRange {
  filename: string;
  first: SourceLocation;
  last: SourceLocation;
  text: string;

    constructor(args?: { filename: string; first: SourceLocation; last: SourceLocation; text: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class Symbol {
  name: string;

    constructor(args?: { name: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * A context ref is a way to refer to, or address, a context. Context refs
 * are primarily sent from the UI to the debugger when performing operations
 * which require a context. The debugger will then have to obtain a DkContext
 * object explicity using the kernel client API.
 */
export declare class ContextRef {
  type: ContextType;
  level: number;
  core: number;
  task: number;

    constructor(args?: { type: ContextType; level: number; core: number; task: number; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ContextInfo {
  context: ContextRef;
  aliases: ContextRef;
  sourceRanges: SourceRange[];
  execLocation: Location;
  functionName: string;

    constructor(args?: { context: ContextRef; aliases: ContextRef; sourceRanges: SourceRange[]; execLocation: Location; functionName: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Settings needed for the stack view. These needs to be part of the
 * initial debugger configuration, and cannot wait until the stack view
 * is shown.
 */
export declare class StackSettings {
  fillEnabled: boolean;
  overflowWarningsEnabled: boolean;
  spWarningsEnabled: boolean;
  warnLogOnly: boolean;
  warningThreshold: number;
  useTrigger: boolean;
  triggerName: string;
  limitDisplay: boolean;
  displayLimit: number;

    constructor(args?: { fillEnabled: boolean; overflowWarningsEnabled: boolean; spWarningsEnabled: boolean; warnLogOnly: boolean; warningThreshold: number; useTrigger: boolean; triggerName: string; limitDisplay: boolean; displayLimit: number; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Information about a breakpoint.
 */
export declare class Breakpoint {
  id: number;
  ule: string;
  category: string;
  descriptor: string;
  description: string;
  enabled: boolean;
  isUleBased: boolean;
  accessType: AccessType;
  valid: boolean;

    constructor(args?: { id: number; ule: string; category: string; descriptor: string; description: string; enabled: boolean; isUleBased: boolean; accessType: AccessType; valid: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class PropertyTreeItem {
  key: string;
  value: string;
  children: PropertyTreeItem[];

    constructor(args?: { key: string; value: string; children: PropertyTreeItem[]; });
  read(input: Object): void;
  write(input: Object): void;
}
