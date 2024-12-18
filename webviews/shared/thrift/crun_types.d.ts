//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');


export declare enum CRunBreakAction {
  kStopAndLog = 0,
  kLog = 1,
  kIgnore = 2,
}

export declare class CRunMessage {
  id: number;
  index: number;
  core: number;
  name: string;
  text: string;
  cycle: Int64;
  repeatCount: number;
  subMessages: CRunMessage[];
  callStack: string[];
  noStop: boolean;
  runTo: Location;
  userProgramCounter: Location;
  extraSourceRanges: SourceRange[];
  pcSourceRange: SourceRange;
  tooltip: string;
  breakAction: CRunBreakAction;

    constructor(args?: { id: number; index: number; core: number; name: string; text: string; cycle: Int64; repeatCount: number; subMessages: CRunMessage[]; callStack: string[]; noStop: boolean; runTo: Location; userProgramCounter: Location; extraSourceRanges: SourceRange[]; pcSourceRange: SourceRange; tooltip: string; breakAction: CRunBreakAction; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare var CRUN_DISPLAY_SERVICE: string;

export declare var CRUN_BACKEND_SERVICE: string;
