/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { projectmanager } from "./projectmanager_types";


/**
 * A service which manages Embedded Workbench project files (.ewp)
 * 
 * It can manipulate the project nodes and build configurations, as well as reading/writing
 * their respective settings.
 * 
 * It also holds the one and only workspace.
 * For project operations the workspace is implicit (no context parameter needed).
 * If project operations are made without creating or loading any workspace first
 * an 'anonymous' workspace is created. An 'anonymous' workspace cannot be saved.
 * 
 * There is also experimental support to register new toolchains directly from the service, without
 * requiring an swtd library. This is however very limited as of now in that there is
 * no option support for the tools in the toolchain.
 */
export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  /**
   * will be created.
   */
  CreateEwwFile(file_path: string): Q.Promise<WorkspaceContext>;

  /**
   * will be created.
   */
  CreateEwwFile(file_path: string, callback?: (data: WorkspaceContext)=>void): void;

  /**
   * Disable the storing of data into the wsdt file used mostly by MFC side
   */
  DisableAutoDataStoring(): Q.Promise<void>;

  /**
   * Disable the storing of data into the wsdt file used mostly by MFC side
   */
  DisableAutoDataStoring(callback?: (data: void)=>void): void;

  /**
   * Supplying an empty path will create an empty workspace and not attempt to load anything.
   */
  LoadEwwFile(file_path: string): Q.Promise<WorkspaceContext>;

  /**
   * Supplying an empty path will create an empty workspace and not attempt to load anything.
   */
  LoadEwwFile(file_path: string, callback?: (data: WorkspaceContext)=>void): void;

  /**
   * Returns true is there is cached data that is not saved.
   */
  IsWorkspaceModified(): Q.Promise<boolean>;

  /**
   * Returns true is there is cached data that is not saved.
   */
  IsWorkspaceModified(callback?: (data: boolean)=>void): void;

  /**
   * There is always only one workspace so no context is needed.
   */
  SaveEwwFile(): Q.Promise<void>;

  /**
   * There is always only one workspace so no context is needed.
   */
  SaveEwwFile(callback?: (data: void)=>void): void;

  /**
   * Save workspace to new file.
   */
  SaveEwwFileAs(file_path: string): Q.Promise<void>;

  /**
   * Save workspace to new file.
   */
  SaveEwwFileAs(file_path: string, callback?: (data: void)=>void): void;

  /**
   * There is always only one workspace so no context is needed.
   */
  GetProjects(): Q.Promise<ProjectContext[]>;

  /**
   * There is always only one workspace so no context is needed.
   */
  GetProjects(callback?: (data: ProjectContext[])=>void): void;

  /**
   * There is always only one workspace so no context is needed. Requires a target.
   */
  GetLoadedProjects(): Q.Promise<ProjectContext[]>;

  /**
   * There is always only one workspace so no context is needed. Requires a target.
   */
  GetLoadedProjects(callback?: (data: ProjectContext[])=>void): void;

  /**
   * If no project has been set as current the returned context will have an empty filename.
   */
  GetCurrentProject(): Q.Promise<ProjectContext>;

  /**
   * If no project has been set as current the returned context will have an empty filename.
   */
  GetCurrentProject(callback?: (data: ProjectContext)=>void): void;

  /**
   * This change is saved to the settings file.
   */
  SetCurrentProject(ctx: ProjectContext): Q.Promise<void>;

  /**
   * This change is saved to the settings file.
   */
  SetCurrentProject(ctx: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * Close loaded workspace, freeing the resources allocated for it by the project manager.
   */
  CloseWorkspace(): Q.Promise<void>;

  /**
   * Close loaded workspace, freeing the resources allocated for it by the project manager.
   */
  CloseWorkspace(callback?: (data: void)=>void): void;

  /**
   * Create new, empty project with the provided file path
   */
  CreateEwpFile(file_path: string): Q.Promise<ProjectContext>;

  /**
   * Create new, empty project with the provided file path
   */
  CreateEwpFile(file_path: string, callback?: (data: ProjectContext)=>void): void;

  /**
   * Create new, empty project with the provided file path and toolchain
   */
  CreateEwpFileWithToolChain(file_path: string, toolchain: string): Q.Promise<ProjectContext>;

  /**
   * Create new, empty project with the provided file path and toolchain
   */
  CreateEwpFileWithToolChain(file_path: string, toolchain: string, callback?: (data: ProjectContext)=>void): void;

  /**
   * Create new project from a template
   */
  CreateProjectFromTemplate(template_path: string, project_path: string): Q.Promise<ProjectContext>;

  /**
   * Create new project from a template
   */
  CreateProjectFromTemplate(template_path: string, project_path: string, callback?: (data: ProjectContext)=>void): void;

  /**
   * Load project from .ewp file
   */
  LoadEwpFile(file_path: string): Q.Promise<ProjectContext>;

  /**
   * Load project from .ewp file
   */
  LoadEwpFile(file_path: string, callback?: (data: ProjectContext)=>void): void;

  /**
   * Save project to file specified in the context
   */
  SaveEwpFile(project: ProjectContext): Q.Promise<void>;

  /**
   * Save project to file specified in the context
   */
  SaveEwpFile(project: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * Reload project that has for example been modified on disk.
   */
  ReloadProject(project: ProjectContext): Q.Promise<ProjectContext>;

  /**
   * Reload project that has for example been modified on disk.
   */
  ReloadProject(project: ProjectContext, callback?: (data: ProjectContext)=>void): void;

  /**
   * Save a copy of the project to a new file.
   * 
   * Note that the new project needs to be opened separately if needed.
   */
  SaveEwpFileAs(project: ProjectContext, file_path: string): Q.Promise<void>;

  /**
   * Save a copy of the project to a new file.
   * 
   * Note that the new project needs to be opened separately if needed.
   */
  SaveEwpFileAs(project: ProjectContext, file_path: string, callback?: (data: void)=>void): void;

  /**
   * Imports the files of a given project file to the given project.
   */
  ImportProjectFiles(ctx: ProjectContext, file_path: string): Q.Promise<boolean>;

  /**
   * Imports the files of a given project file to the given project.
   */
  ImportProjectFiles(ctx: ProjectContext, file_path: string, callback?: (data: boolean)=>void): void;

  /**
   * Returns true if there is cached data that is not saved.
   */
  IsModified(project: ProjectContext): Q.Promise<boolean>;

  /**
   * Returns true if there is cached data that is not saved.
   */
  IsModified(project: ProjectContext, callback?: (data: boolean)=>void): void;

  /**
   * Returns true if the given file is a member of current project.
   */
  IsMemberOfCurrentProject(file_path: string): Q.Promise<boolean>;

  /**
   * Returns true if the given file is a member of current project.
   */
  IsMemberOfCurrentProject(file_path: string, callback?: (data: boolean)=>void): void;

  /**
   * if input file is a source file and source files if it is a header file.
   */
  FindMatchingHeaderOrSourceFile(file_path: string): Q.Promise<string[]>;

  /**
   * if input file is a source file and source files if it is a header file.
   */
  FindMatchingHeaderOrSourceFile(file_path: string, callback?: (data: string[])=>void): void;

  /**
   * Get existing project context given file path
   */
  GetProject(file_path: string): Q.Promise<ProjectContext>;

  /**
   * Get existing project context given file path
   */
  GetProject(file_path: string, callback?: (data: ProjectContext)=>void): void;

  /**
   * It only has any effect on anonymous workspaces.
   */
  CloseProject(project: ProjectContext): Q.Promise<void>;

  /**
   * It only has any effect on anonymous workspaces.
   */
  CloseProject(project: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * Remove the project from the workspace. This works on any workspace as opposed to CloseProject.
   */
  RemoveProject(project: ProjectContext): Q.Promise<void>;

  /**
   * Remove the project from the workspace. This works on any workspace as opposed to CloseProject.
   */
  RemoveProject(project: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * on the project wide collection.
   */
  GetFiles(project: ProjectContext, configurationName: string, col: FileCollectionType): Q.Promise<string[]>;

  /**
   * on the project wide collection.
   */
  GetFiles(project: ProjectContext, configurationName: string, col: FileCollectionType, callback?: (data: string[])=>void): void;

  /**
   * Add a Configuration to a project
   */
  AddConfiguration(config: Configuration, project: ProjectContext, isDebug: boolean): Q.Promise<void>;

  /**
   * Add a Configuration to a project
   */
  AddConfiguration(config: Configuration, project: ProjectContext, isDebug: boolean, callback?: (data: void)=>void): void;

  /**
   * Does not save the project.
   */
  AddConfigurationNoSave(project: ProjectContext, config: Configuration, basedOnName: string): Q.Promise<void>;

  /**
   * Does not save the project.
   */
  AddConfigurationNoSave(project: ProjectContext, config: Configuration, basedOnName: string, callback?: (data: void)=>void): void;

  /**
   * Remove a Configuration from a project given its name
   */
  RemoveConfiguration(configurationName: string, project: ProjectContext): Q.Promise<void>;

  /**
   * Remove a Configuration from a project given its name
   */
  RemoveConfiguration(configurationName: string, project: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * Does not save the project.
   */
  RemoveConfigurationNoSave(project: ProjectContext, configurationName: string): Q.Promise<void>;

  /**
   * Does not save the project.
   */
  RemoveConfigurationNoSave(project: ProjectContext, configurationName: string, callback?: (data: void)=>void): void;

  /**
   * Get all Configurations in a project
   */
  GetConfigurations(project: ProjectContext): Q.Promise<Configuration[]>;

  /**
   * Get all Configurations in a project
   */
  GetConfigurations(project: ProjectContext, callback?: (data: Configuration[])=>void): void;

  /**
   * are put last in the order they are.
   */
  SetConfigurationsOrder(project: ProjectContext, configNames: string[]): Q.Promise<void>;

  /**
   * are put last in the order they are.
   */
  SetConfigurationsOrder(project: ProjectContext, configNames: string[], callback?: (data: void)=>void): void;

  /**
   * Get current configuration.
   */
  GetCurrentConfiguration(project: ProjectContext): Q.Promise<Configuration>;

  /**
   * Get current configuration.
   */
  GetCurrentConfiguration(project: ProjectContext, callback?: (data: Configuration)=>void): void;

  /**
   * This change is saved to the settings file.
   */
  SetCurrentConfiguration(project: ProjectContext, configurationName: string): Q.Promise<void>;

  /**
   * This change is saved to the settings file.
   */
  SetCurrentConfiguration(project: ProjectContext, configurationName: string, callback?: (data: void)=>void): void;

  /**
   * Desktop path parameters
   */
  SetDesktopPathParameters(platform: DesktopPathPlatform, slavery: DesktopPathSlavery): Q.Promise<void>;

  /**
   * Desktop path parameters
   */
  SetDesktopPathParameters(platform: DesktopPathPlatform, slavery: DesktopPathSlavery, callback?: (data: void)=>void): void;

  /**
   * Get the path to the off-line desktop settings file for the workspace *
   */
  GetOfflineDesktopPath(): Q.Promise<string>;

  /**
   * Get the path to the off-line desktop settings file for the workspace *
   */
  GetOfflineDesktopPath(callback?: (data: string)=>void): void;

  /**
   * Get the path to the on-line desktop settings file for the current project *
   */
  GetOnlineDesktopPath(): Q.Promise<string>;

  /**
   * Get the path to the on-line desktop settings file for the current project *
   */
  GetOnlineDesktopPath(callback?: (data: string)=>void): void;

  /**
   * Get the root of a project's file and group hierarchy tree, including all children
   */
  GetRootNode(ctx: ProjectContext): Q.Promise<Node>;

  /**
   * Get the root of a project's file and group hierarchy tree, including all children
   */
  GetRootNode(ctx: ProjectContext, callback?: (data: Node)=>void): void;

  /**
   * @deprecated, only provided for backwards compatibility with old VSCode plugins.
   */
  SetNode(ctx: ProjectContext, node: Node): Q.Promise<void>;

  /**
   * @deprecated, only provided for backwards compatibility with old VSCode plugins.
   */
  SetNode(ctx: ProjectContext, node: Node, callback?: (data: void)=>void): void;

  /**
   * If the node is not part of the project, returned node has type == Invalid.
   */
  GetNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[]): Q.Promise<Node>;

  /**
   * If the node is not part of the project, returned node has type == Invalid.
   */
  GetNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], callback?: (data: Node)=>void): void;

  /**
   * If the node is not part of the project an exception is thrown.
   */
  SetNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], node: Node, save: boolean): Q.Promise<void>;

  /**
   * If the node is not part of the project an exception is thrown.
   */
  SetNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], node: Node, save: boolean, callback?: (data: void)=>void): void;

  /**
   * If the node is not part of the project an exception is thrown.
   */
  AddNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], node: Node, save: boolean): Q.Promise<void>;

  /**
   * If the node is not part of the project an exception is thrown.
   */
  AddNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], node: Node, save: boolean, callback?: (data: void)=>void): void;

  /**
   * Some nodes cannot be removed - just silently ignored then
   */
  RemoveNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], save: boolean): Q.Promise<void>;

  /**
   * Some nodes cannot be removed - just silently ignored then
   */
  RemoveNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], save: boolean, callback?: (data: void)=>void): void;

  /**
   * If the node is not part of the project an exception is thrown.
   */
  UpdateNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], node: Node, save: boolean): Q.Promise<void>;

  /**
   * If the node is not part of the project an exception is thrown.
   */
  UpdateNodeByIndex(ctx: ProjectContext, nodeIndexPath: Int64[], node: Node, save: boolean, callback?: (data: void)=>void): void;

  /**
   * Determine whether a node can be moved to another.
   */
  CanMoveNode(ctx: ProjectContext, srcNodeIndexPath: Int64[], dstNodeIndexPath: Int64[]): Q.Promise<boolean>;

  /**
   * Determine whether a node can be moved to another.
   */
  CanMoveNode(ctx: ProjectContext, srcNodeIndexPath: Int64[], dstNodeIndexPath: Int64[], callback?: (data: boolean)=>void): void;

  /**
   * If for some reason the move canot be done, false is returned.
   */
  MoveNode(ctx: ProjectContext, srcNodeIndexPath: Int64[], dstNodeIndexPath: Int64[]): Q.Promise<boolean>;

  /**
   * If for some reason the move canot be done, false is returned.
   */
  MoveNode(ctx: ProjectContext, srcNodeIndexPath: Int64[], dstNodeIndexPath: Int64[], callback?: (data: boolean)=>void): void;

  /**
   * Within each string [:;, ] are used as separators
   */
  GetToolChainExtensions(ctx: ProjectContext): Q.Promise<string[]>;

  /**
   * Within each string [:;, ] are used as separators
   */
  GetToolChainExtensions(ctx: ProjectContext, callback?: (data: string[])=>void): void;

  /**
   * Get a list of available Toolchains.
   * 
   * Note that as of now the retrieved toolchains cannot provide a complete list of tools.
   * Prior to IDE 9.3, the tools list is empty. In later versions, it contains only a
   * compiler and assembler (if available), and the definitions for those tools only
   * populate the 'toolType' and 'id' fields.
   * A workaround is that the option categories ids usually match
   * the tool IDs, so they can be used as such in e.g. GetToolCommandLineForConfiguration(). See MAJ-114
   */
  GetToolchains(): Q.Promise<Toolchain[]>;

  /**
   * Get a list of available Toolchains.
   * 
   * Note that as of now the retrieved toolchains cannot provide a complete list of tools.
   * Prior to IDE 9.3, the tools list is empty. In later versions, it contains only a
   * compiler and assembler (if available), and the definitions for those tools only
   * populate the 'toolType' and 'id' fields.
   * A workaround is that the option categories ids usually match
   * the tool IDs, so they can be used as such in e.g. GetToolCommandLineForConfiguration(). See MAJ-114
   */
  GetToolchains(callback?: (data: Toolchain[])=>void): void;

  /**
   * Register a toolchain with the project manager. Will fail if the toolchain is already registered.
   */
  AddToolchain(toolchain: Toolchain): Q.Promise<void>;

  /**
   * Register a toolchain with the project manager. Will fail if the toolchain is already registered.
   */
  AddToolchain(toolchain: Toolchain, callback?: (data: void)=>void): void;

  /**
   * Update the definition for a tool
   */
  UpdateTool(toolchainId: string, tool: ToolDefinition): Q.Promise<boolean>;

  /**
   * Update the definition for a tool
   */
  UpdateTool(toolchainId: string, tool: ToolDefinition, callback?: (data: boolean)=>void): void;

  /**
   * Get batch build item list.
   */
  GetBatchBuildItems(): Q.Promise<BatchBuildItem[]>;

  /**
   * Get batch build item list.
   */
  GetBatchBuildItems(callback?: (data: BatchBuildItem[])=>void): void;

  /**
   * the same as the one already stored.
   */
  SetBatchBuildItems(batchBuildItems: BatchBuildItem[]): Q.Promise<void>;

  /**
   * the same as the one already stored.
   */
  SetBatchBuildItems(batchBuildItems: BatchBuildItem[], callback?: (data: void)=>void): void;

  /**
   * Build a project configuration synchronously, and return its result
   */
  BuildProject(prj: ProjectContext, configurationName: string, numParallelBuilds: number): Q.Promise<BuildResult>;

  /**
   * Build a project configuration synchronously, and return its result
   */
  BuildProject(prj: ProjectContext, configurationName: string, numParallelBuilds: number, callback?: (data: BuildResult)=>void): void;

  /**
   * Rebuilds project configurations asynchronously
   */
  RebuildAllAsync(buildItems: BuildItem[], stopAtError: boolean, numParallelBuilds: number): Q.Promise<void>;

  /**
   * Rebuilds project configurations asynchronously
   */
  RebuildAllAsync(buildItems: BuildItem[], stopAtError: boolean, numParallelBuilds: number, callback?: (data: void)=>void): void;

  /**
   * Rebuilds project configurations asynchronously
   */
  CanCompile(buildItem: BuildItem): Q.Promise<boolean>;

  /**
   * Rebuilds project configurations asynchronously
   */
  CanCompile(buildItem: BuildItem, callback?: (data: boolean)=>void): void;

  /**
   * Compile a set of files asynchronously
   */
  CompileAsync(buildItem: BuildItem, numParallelBuilds: number): Q.Promise<void>;

  /**
   * Compile a set of files asynchronously
   */
  CompileAsync(buildItem: BuildItem, numParallelBuilds: number, callback?: (data: void)=>void): void;

  /**
   * Builds project configurations asynchronously
   */
  BuildAsync(buildItems: BuildItem[], stopAtError: boolean, numParallelBuilds: number): Q.Promise<void>;

  /**
   * Builds project configurations asynchronously
   */
  BuildAsync(buildItems: BuildItem[], stopAtError: boolean, numParallelBuilds: number, callback?: (data: void)=>void): void;

  /**
   * Clean project configurations asynchronously
   */
  CleanAsync(buildItems: BuildItem[]): Q.Promise<void>;

  /**
   * Clean project configurations asynchronously
   */
  CleanAsync(buildItems: BuildItem[], callback?: (data: void)=>void): void;

  /**
   * Stop an ongoing build.
   */
  CancelBuild(): Q.Promise<void>;

  /**
   * Stop an ongoing build.
   */
  CancelBuild(callback?: (data: void)=>void): void;

  /**
   * Stop an ongoing static code analysis.
   */
  TerminateAnalysis(): Q.Promise<void>;

  /**
   * Stop an ongoing static code analysis.
   */
  TerminateAnalysis(callback?: (data: void)=>void): void;

  /**
   * Get a list of all build nodes describing how to build the given project configuration.
   */
  GetBuildNodes(prj: ProjectContext, configurationName: string, toolIdentifier: string): Q.Promise<BuildNode[]>;

  /**
   * Get a list of all build nodes describing how to build the given project configuration.
   */
  GetBuildNodes(prj: ProjectContext, configurationName: string, toolIdentifier: string, callback?: (data: BuildNode[])=>void): void;

  /**
   * Get a list of options for the given node (file, group) in a project, within the given configuration .
   */
  GetOptionsForNode(prj: ProjectContext, node: Node, configurationName: string, optionIds?: string[]): Q.Promise<OptionDescription[]>;

  /**
   * Get a list of options for the given node (file, group) in a project, within the given configuration .
   */
  GetOptionsForNode(prj: ProjectContext, node: Node, configurationName: string, optionIds?: string[], callback?: (data: OptionDescription[])=>void): void;

  /**
   * Get a list of options for the given build configuration in a project.
   */
  GetOptionsForConfiguration(prj: ProjectContext, configurationName: string, optionIds?: string[]): Q.Promise<OptionDescription[]>;

  /**
   * Get a list of options for the given build configuration in a project.
   */
  GetOptionsForConfiguration(prj: ProjectContext, configurationName: string, optionIds?: string[], callback?: (data: OptionDescription[])=>void): void;

  /**
   * Set a list of options for the given node (file, group) in a project. Return a list of updated options.
   */
  ApplyOptionsForNode(prj: ProjectContext, node: Node, configurationName: string, optionsToSet: OptionDescription[]): Q.Promise<OptionDescription[]>;

  /**
   * Set a list of options for the given node (file, group) in a project. Return a list of updated options.
   */
  ApplyOptionsForNode(prj: ProjectContext, node: Node, configurationName: string, optionsToSet: OptionDescription[], callback?: (data: OptionDescription[])=>void): void;

  /**
   * Set a list of options for the given node (file, group) in a project without saving to the EWP file. Return a list of updated options.
   */
  VerifyOptionsForNode(prj: ProjectContext, node: Node, configurationName: string, optionsToSet: OptionDescription[]): Q.Promise<OptionDescription[]>;

  /**
   * Set a list of options for the given node (file, group) in a project without saving to the EWP file. Return a list of updated options.
   */
  VerifyOptionsForNode(prj: ProjectContext, node: Node, configurationName: string, optionsToSet: OptionDescription[], callback?: (data: OptionDescription[])=>void): void;

  /**
   * Set a list of options for the given build configuration in a project. Return a list of updated options.
   */
  ApplyOptionsForConfiguration(prj: ProjectContext, configurationName: string, optionsToSet: OptionDescription[]): Q.Promise<OptionDescription[]>;

  /**
   * Set a list of options for the given build configuration in a project. Return a list of updated options.
   */
  ApplyOptionsForConfiguration(prj: ProjectContext, configurationName: string, optionsToSet: OptionDescription[], callback?: (data: OptionDescription[])=>void): void;

  /**
   * Set a list of options for the given build configuration in a project without saving to the EWP file. Return a list of updated options.
   */
  VerifyOptionsForConfiguration(prj: ProjectContext, configurationName: string, optionsToSet: OptionDescription[]): Q.Promise<OptionDescription[]>;

  /**
   * Set a list of options for the given build configuration in a project without saving to the EWP file. Return a list of updated options.
   */
  VerifyOptionsForConfiguration(prj: ProjectContext, configurationName: string, optionsToSet: OptionDescription[], callback?: (data: OptionDescription[])=>void): void;

  /**
   * Get a list of option categories for a given configuration
   */
  GetOptionCategories(prj: ProjectContext, configurationName: string): Q.Promise<OptionCategory[]>;

  /**
   * Get a list of option categories for a given configuration
   */
  GetOptionCategories(prj: ProjectContext, configurationName: string, callback?: (data: OptionCategory[])=>void): void;

  /**
   * Enable/disable multi-file compilation for the provided project, configuration and project node
   */
  EnableMultiFileCompilation(prj: ProjectContext, configurationName: string, node: Node, enabled: boolean): Q.Promise<void>;

  /**
   * Enable/disable multi-file compilation for the provided project, configuration and project node
   */
  EnableMultiFileCompilation(prj: ProjectContext, configurationName: string, node: Node, enabled: boolean, callback?: (data: void)=>void): void;

  /**
   * Enable/disable multi-file 'discard public symbols' for the provided project, configuration and project node
   */
  EnableMultiFileDiscardPublicSymbols(prj: ProjectContext, configurationName: string, node: Node, enabled: boolean): Q.Promise<void>;

  /**
   * Enable/disable multi-file 'discard public symbols' for the provided project, configuration and project node
   */
  EnableMultiFileDiscardPublicSymbols(prj: ProjectContext, configurationName: string, node: Node, enabled: boolean, callback?: (data: void)=>void): void;

  /**
   * Returns whether multi-file compilation is enabled for the provided project, configuration and project node
   */
  IsMultiFileCompilationEnabled(prj: ProjectContext, configurationName: string, node: Node): Q.Promise<boolean>;

  /**
   * Returns whether multi-file compilation is enabled for the provided project, configuration and project node
   */
  IsMultiFileCompilationEnabled(prj: ProjectContext, configurationName: string, node: Node, callback?: (data: boolean)=>void): void;

  /**
   * Returns whether multi-file 'discard public symbols' is enabled for the provided project, configuration and project node
   */
  IsMultiFileDiscardPublicSymbolsEnabled(prj: ProjectContext, configurationName: string, node: Node): Q.Promise<boolean>;

  /**
   * Returns whether multi-file 'discard public symbols' is enabled for the provided project, configuration and project node
   */
  IsMultiFileDiscardPublicSymbolsEnabled(prj: ProjectContext, configurationName: string, node: Node, callback?: (data: boolean)=>void): void;

  /**
   * Get the command line arguments of a tool given a build configuration in a project.
   * Note that GetToolchains() cannot currently provide information about the tools in a toolchain, so the tool
   * ids must be either known in advance, or assumed to match option category ids. See MAJ-114
   */
  GetToolArgumentsForConfiguration(prj: ProjectContext, toolId: string, configurationName: string): Q.Promise<string[]>;

  /**
   * Get the command line arguments of a tool given a build configuration in a project.
   * Note that GetToolchains() cannot currently provide information about the tools in a toolchain, so the tool
   * ids must be either known in advance, or assumed to match option category ids. See MAJ-114
   */
  GetToolArgumentsForConfiguration(prj: ProjectContext, toolId: string, configurationName: string, callback?: (data: string[])=>void): void;

  /**
   * Expand all argument variables ('argvar' e.g. $TOOLKIT_DIR$) in the provided input string,
   * given the current workspace and provided project and build configuration
   */
  ExpandArgVars(input: string, project: ProjectContext, configurationName: string, throwOnFailure: boolean): Q.Promise<string>;

  /**
   * Expand all argument variables ('argvar' e.g. $TOOLKIT_DIR$) in the provided input string,
   * given the current workspace and provided project and build configuration
   */
  ExpandArgVars(input: string, project: ProjectContext, configurationName: string, throwOnFailure: boolean, callback?: (data: string)=>void): void;

  /**
   * Gets a JSON representaion of the option presentation
   * 
   * Supported locales: en_GB
   */
  GetPresentationForOptionsAsJson(locale: string): Q.Promise<string>;

  /**
   * Gets a JSON representaion of the option presentation
   * 
   * Supported locales: en_GB
   */
  GetPresentationForOptionsAsJson(locale: string, callback?: (data: string)=>void): void;

  /**
   * Update all project connections listed for the given project.
   */
  UpdateProjectConnections(prj: ProjectContext): Q.Promise<void>;

  /**
   * Update all project connections listed for the given project.
   */
  UpdateProjectConnections(prj: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * Run the update sequence for a specific file.
   */
  UpdateProjectConnection(prj: ProjectContext, file: string): Q.Promise<boolean>;

  /**
   * Run the update sequence for a specific file.
   */
  UpdateProjectConnection(prj: ProjectContext, file: string, callback?: (data: boolean)=>void): void;

  /**
   * Remove all created monitors for a given project.
   */
  RemoveMonitors(prj: ProjectContext): Q.Promise<void>;

  /**
   * Remove all created monitors for a given project.
   */
  RemoveMonitors(prj: ProjectContext, callback?: (data: void)=>void): void;

  /**
   * Enable/disable the usage of project connection files.
   */
  EnableProjectConnections(enable: boolean): Q.Promise<void>;

  /**
   * Enable/disable the usage of project connection files.
   */
  EnableProjectConnections(enable: boolean, callback?: (data: void)=>void): void;

  IsExternalProjectUpToDate(prj: ProjectContext): Q.Promise<boolean>;

  IsExternalProjectUpToDate(prj: ProjectContext, callback?: (data: boolean)=>void): void;

  SynchonizeExternalProject(prj: ProjectContext): Q.Promise<boolean>;

  SynchonizeExternalProject(prj: ProjectContext, callback?: (data: boolean)=>void): void;

  ConfigureExternalProject(prj: ProjectContext, force: boolean): Q.Promise<boolean>;

  ConfigureExternalProject(prj: ProjectContext, force: boolean, callback?: (data: boolean)=>void): void;

  /**
   * Add a control file for a specific plugin. Throws if:
   * 1. The supplied plugin does not exist.
   * 2. The supplied plugin does not accept the given file.
   */
  AddControlFile(prj: ProjectContext, file: string, pluginId: string): Q.Promise<void>;

  /**
   * Add a control file for a specific plugin. Throws if:
   * 1. The supplied plugin does not exist.
   * 2. The supplied plugin does not accept the given file.
   */
  AddControlFile(prj: ProjectContext, file: string, pluginId: string, callback?: (data: void)=>void): void;

  /**
   * Check if the project has a control file node registered for a given plugin.
   */
  HasControlFileFor(prj: ProjectContext, pluginId: string): Q.Promise<boolean>;

  /**
   * Check if the project has a control file node registered for a given plugin.
   */
  HasControlFileFor(prj: ProjectContext, pluginId: string, callback?: (data: boolean)=>void): void;

  /**
   * Check if project connection is enabled.
   */
  IsProjectConnectionsEnabled(): Q.Promise<boolean>;

  /**
   * Check if project connection is enabled.
   */
  IsProjectConnectionsEnabled(callback?: (data: boolean)=>void): void;

  /**
   * Get a list with information about the set of registered control files plugins.
   */
  GetControlFilePlugins(): Q.Promise<ControlFilePlugin[]>;

  /**
   * Get a list with information about the set of registered control files plugins.
   */
  GetControlFilePlugins(callback?: (data: ControlFilePlugin[])=>void): void;

  GetOptionsForProject(prj: ProjectContext): Q.Promise<OptionDescription[]>;

  GetOptionsForProject(prj: ProjectContext, callback?: (data: OptionDescription[])=>void): void;

  ApplyOptionsForProject(prj: ProjectContext, options: OptionDescription[]): Q.Promise<boolean>;

  ApplyOptionsForProject(prj: ProjectContext, options: OptionDescription[], callback?: (data: boolean)=>void): void;

  /**
   * Get the current settings for user-defined argument variables
   */
  GetUserArgVarInfo(category: UserArgVarCategory): Q.Promise<UserArgVarGroupInfo[]>;

  /**
   * Get the current settings for user-defined argument variables
   */
  GetUserArgVarInfo(category: UserArgVarCategory, callback?: (data: UserArgVarGroupInfo[])=>void): void;

  /**
   * Set the current settings for user-defined argument variables
   */
  SetUserArgVarInfo(info: UserArgVarGroupInfo[]): Q.Promise<void>;

  /**
   * Set the current settings for user-defined argument variables
   */
  SetUserArgVarInfo(info: UserArgVarGroupInfo[], callback?: (data: void)=>void): void;

  /**
   * Load the current settings for user-defined argument variables from a file
   */
  ImportUserArgVarInfo(category: UserArgVarCategory, argVarFilePath: string): Q.Promise<void>;

  /**
   * Load the current settings for user-defined argument variables from a file
   */
  ImportUserArgVarInfo(category: UserArgVarCategory, argVarFilePath: string, callback?: (data: void)=>void): void;

  /**
   * Save the current settings for user-defined argument variables to a file
   */
  ExportUserArgVarInfo(category: UserArgVarCategory, argVarFilePath: string): Q.Promise<void>;

  /**
   * Save the current settings for user-defined argument variables to a file
   */
  ExportUserArgVarInfo(category: UserArgVarCategory, argVarFilePath: string, callback?: (data: void)=>void): void;

  /**
   * Get the current external tools
   */
  GetExternalTools(): Q.Promise<ExternalTool[]>;

  /**
   * Get the current external tools
   */
  GetExternalTools(callback?: (data: ExternalTool[])=>void): void;

  /**
   * Set the external tools to use
   */
  SetExternalTools(tools: ExternalTool[]): Q.Promise<void>;

  /**
   * Set the external tools to use
   */
  SetExternalTools(tools: ExternalTool[], callback?: (data: void)=>void): void;

  /**
   * Get the list of available plugins
   */
  GetWizards(toolchainId: string): Q.Promise<WizardPlugin[]>;

  /**
   * Get the list of available plugins
   */
  GetWizards(toolchainId: string, callback?: (data: WizardPlugin[])=>void): void;

  /**
   * Run a wizard
   */
  RunWizard(wizard: WizardPlugin): Q.Promise<ProjectContext>;

  /**
   * Run a wizard
   */
  RunWizard(wizard: WizardPlugin, callback?: (data: ProjectContext)=>void): void;

  GetGlobalOptions(): Q.Promise<OptionDescription[]>;

  GetGlobalOptions(callback?: (data: OptionDescription[])=>void): void;

  GetGlobalOption(id: string): Q.Promise<OptionDescription[]>;

  GetGlobalOption(id: string, callback?: (data: OptionDescription[])=>void): void;

  ApplyGlobalOptions(options: OptionDescription[]): Q.Promise<OptionDescription[]>;

  ApplyGlobalOptions(options: OptionDescription[], callback?: (data: OptionDescription[])=>void): void;
}
