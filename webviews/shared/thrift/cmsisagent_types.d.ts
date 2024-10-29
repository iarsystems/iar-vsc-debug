//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');


export declare enum OutputType {
  exe = 0,
  lib = 1,
}

export declare enum FileCategory {
  kDoc = 0,
  kHeader = 1,
  kInclude = 2,
  kLibrary = 3,
  kObject = 4,
  kSource = 5,
  kSourceC = 6,
  kSourceCpp = 7,
  kSourceAsm = 8,
  kLinkerScript = 9,
  kUtility = 10,
  kImage = 11,
  kOther = 12,
}

export declare class FileInfo {
  name: string;
  attr: string;
  category: FileCategory;
  isGenerated: boolean;
  projectRelativePath: string;

    constructor(args?: { name: string; attr: string; category: FileCategory; isGenerated: boolean; projectRelativePath: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ComponentInfo {
  deviceClass: string;
  group: string;
  vendor: string;
  version: string;
  variant: string;
  sub: string;
  generator: string;
  id: string;
  packId: string;
  rteComponentsH: string;
  selectedCount: number;
  sourceFiles: FileInfo[];

    constructor(args?: { deviceClass: string; group: string; vendor: string; version: string; variant: string; sub: string; generator: string; id: string; packId: string; rteComponentsH: string; selectedCount: number; sourceFiles: FileInfo[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class CompileInfo {
  Pname: string;
  header: string;
  define: string;

    constructor(args?: { Pname: string; header: string; define: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ProcessorInfo {
  Pname: string;
  Dvendor: string;
  Dcore: string;
  Dfpu: string;
  Dmpu: string;
  Dendian: string;
  Dclock: string;
  DcoreVersion: string;

    constructor(args?: { Pname: string; Dvendor: string; Dcore: string; Dfpu: string; Dmpu: string; Dendian: string; Dclock: string; DcoreVersion: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class DeviceInfo {
  id: string;
  name: string;
  packId: string;
  family: string;
  vendor: string;
  subFamily: string;
  variant: string;
  compile: CompileInfo[];
  processor: ProcessorInfo[];

    constructor(args?: { id: string; name: string; packId: string; family: string; vendor: string; subFamily: string; variant: string; compile: CompileInfo[]; processor: ProcessorInfo[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class ValidationStatus {
  id: string;
  result: string;
  fulfilled: boolean;
  description: string;
  children: ValidationStatus[];

    constructor(args?: { id: string; result: string; fulfilled: boolean; description: string; children: ValidationStatus[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class Api {
  componentClass: string;
  group: string;
  apiVersion: string;
  vendor: string;
  packId: string;
  exclusive: boolean;
  description: string;
  files: FileInfo[];

    constructor(args?: { componentClass: string; group: string; apiVersion: string; vendor: string; packId: string; exclusive: boolean; description: string; files: FileInfo[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class FileInPack {
  packId: string;
  subPath: string;

    constructor(args?: { packId: string; subPath: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class RteFile {
  packId: string;
  projectRelativePath: string;
  packPath: string;
  packRelativePath: string;
  componentId: string;
  category: FileCategory;
  attr: string;
  isGenerated: boolean;

    constructor(args?: { packId: string; projectRelativePath: string; packPath: string; packRelativePath: string; componentId: string; category: FileCategory; attr: string; isGenerated: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class CMSISAgentException extends Thrift.TException {
  message: string;

    constructor(args?: { message: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class RteEvent {
  topic: string;
  projectName: string;
  ewpFile: string;
  data: string;

    constructor(args?: { topic: string; projectName: string; ewpFile: string; data: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare var CMSISPACK_AGENT2_SERVICE: string;

export declare var CMSISPACK_AGENT2_EVENTLISTENER_SERVICE: string;

export declare var PROJECT_ADDED: string;

export declare var PROJECT_REMOVED: string;

export declare var PROJECT_UPDATED: string;

export declare var PACKS_UPDATED: string;

export declare var PACKS_RELOADED: string;

export declare var PROTOCOL_VERSION: number;