//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');


/**
 * Each type describes the role of a tool in a C/C++ project build
 */
export declare enum ToolType {
  Compiler = 1,
  Assembler = 2,
  Linker = 3,
  Archiver = 4,
  Other = 5,
}

/**
 * Each type describes how a tool is invoked during a build (e.g. single input, multi input)
 */
export declare enum InvocationType {
  SingleInput = 1,
  MultiInput = 2,
}

/**
 * Element types in a project tree
 */
export declare enum NodeType {
  Invalid = 0,
  Group = 1,
  File = 2,
  ControlFile = 3,
}

/**
 * An option type describes which control should be used to manipulate the option in a GUI
 * 
 * These currently match the class names in the SWTD option system, as that is the
 * only option type system which is widely used.
 * TBD: This might change in future versions of this service to match more abstract control types
 * (e.g. Edit is a text box, EditB is actually a tree-like structure).
 */
export declare enum OptionType {
  Check = 0,
  Edit = 1,
  EditB = 2,
  List = 3,
  Radio = 4,
  CheckList = 5,
  BuildActions = 6,
}

/**
 * Enumeration describing different file sets
 */
export declare enum FileCollectionType {
  ProjFiles = 0,
  ProjAndUserIncludeFiles = 1,
  ProjAndAllIncludeFiles = 2,
  WsFiles = 3,
  WsAndUserIncludeFiles = 4,
  WsAndAllIncludeFiles = 5,
}

/**
 * Desktop Path Platforms
 */
export declare enum DesktopPathPlatform {
  Mfc = 0,
  Qt = 1,
}

export declare enum DesktopPathSlavery {
  Master = 0,
  Slave = 1,
}

export declare class ProjectManagerError extends Thrift.TException {
  description: string;

    constructor(args?: { description: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Defines a build tool, e.g. a compiler.
 * 
 * A build tool is uniquely identified by its ID, and declares a set of input
 * and output file extensions to specify which files it is able to transform.
 * 
 */
export declare class ToolDefinition {
  id: string;
  name: string;
  executableName: string;
  inputExtensions: string[];
  outputExtensions: string[];
  hiddenOutputExtensions: string[];
  toolType: ToolType;
  invocationType: InvocationType;

    constructor(args?: { id: string; name: string; executableName: string; inputExtensions: string[]; outputExtensions: string[]; hiddenOutputExtensions: string[]; toolType: ToolType; invocationType: InvocationType; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Defines a hardware target for which projects can be built for using one or more tools
 * (compiler, linker, etc.).
 */
export declare class Toolchain {
  id: string;
  name: string;
  tools: ToolDefinition[];
  toolkitDir: string;
  templatesDir: string;
  modifiable: boolean;

    constructor(args?: { id: string; name: string; tools: ToolDefinition[]; toolkitDir: string; templatesDir: string; modifiable: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * A build configuration represents a way to build a Project.
 * @see ProjectContext
 */
export declare class Configuration {
  name: string;
  toolchainId: string;
  isDebug: boolean;
  isControlFileManaged: boolean;

    constructor(args?: { name: string; toolchainId: string; isDebug: boolean; isControlFileManaged: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Corresponds to a workspace on disk
 */
export declare class WorkspaceContext {
  filename: string;

    constructor(args?: { filename: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Corresponds to a project on disk
 */
export declare class ProjectContext {
  filename: string;

    constructor(args?: { filename: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * A view of an element in a project tree and its children. <p>
 *  This can be modified on the client side and is not persisted in the actual project
 *  until the backend is instructed to save this element.
 * 
 * @see ProjectManager.SetNodeByIndex()
 */
export declare class Node {
  name: string;
  children: Node[];
  type: NodeType;
  path: string;
  isMfcEnabled: boolean;
  isExcludedFromBuild: boolean;
  hasLocalSettings: boolean;
  hasRelevantSettings: boolean;
  childrenHaveLocalSettings: boolean;
  isGenerated: boolean;
  controlFilePlugins: string[];

    constructor(args?: { name: string; children: Node[]; type: NodeType; path: string; isMfcEnabled: boolean; isExcludedFromBuild: boolean; hasLocalSettings: boolean; hasRelevantSettings: boolean; childrenHaveLocalSettings: boolean; isGenerated: boolean; controlFilePlugins: string[]; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * A build step, i.e. a command line that takes some input file(s) and produces
 * some output file(s).
 */
export declare class BuildNode {
  input: string[];
  output: string[];
  arguments: string[];
  directory: string;
  toolName: string;

    constructor(args?: { input: string[]; output: string[]; arguments: string[]; directory: string; toolName: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Properties of an option's element (e.g. list item, radio button, a checkbox in a check list)
 */
export declare class OptionElementDescription {
  id: string;
  label: string;
  enabled: boolean;
  data: string;

    constructor(args?: { id: string; label: string; enabled: boolean; data: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Properties of an option
 */
export declare class OptionDescription {
  id: string;
  value: string;
  type: OptionType;
  elements: OptionElementDescription[];
  enabled: boolean;
  visible: boolean;
  canBeLocal: boolean;

    constructor(args?: { id: string; value: string; type: OptionType; elements: OptionElementDescription[]; enabled: boolean; visible: boolean; canBeLocal: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Associates a group of options under a single category.
 */
export declare class OptionCategory {
  id: string;
  optionIds: string[];

    constructor(args?: { id: string; optionIds: string[]; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Input to builds.
 */
export declare class BuildItem {
  projectContext: ProjectContext;
  configurationName: string;
  nodePaths: string[];

    constructor(args?: { projectContext: ProjectContext; configurationName: string; nodePaths: string[]; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class BatchBuildItem {
  name: string;
  buildItems: BuildItem[];

    constructor(args?: { name: string; buildItems: BuildItem[]; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Stores the result of a build, referring to the project that was built
 */
export declare class BuildResult {
  projectContext: ProjectContext;
  buildOutput: string[];
  succeded: boolean;

    constructor(args?: { projectContext: ProjectContext; buildOutput: string[]; succeded: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * A simple representation of the control file plugins to use in GUI:s
 */
export declare class ControlFilePlugin {
  name: string;
  filefilter: string;
  isInternal: boolean;

    constructor(args?: { name: string; filefilter: string; isInternal: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare var PROJECTMANAGER_ID: string;
