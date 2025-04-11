/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DebugProtocol } from "@vscode/debugprotocol";
import { CSpyServerLauncher } from "./thrift/cspyServerLauncher";
import { LoggingDebugSession, OutputEvent, InitializedEvent, logger, Logger, Thread, TerminatedEvent, InvalidatedEvent, Event, ExitedEvent } from "@vscode/debugadapter";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import * as DebugEventListener from "iar-vsc-common/thrift/bindings/DebugEventListener";
import * as LibSupportService2 from "iar-vsc-common/thrift/bindings/LibSupportService2";
import * as Frontend from "iar-vsc-common/thrift/bindings/Frontend";
import * as TimelineFrontend from "iar-vsc-common/thrift/bindings/TimelineFrontend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { DEBUGEVENT_SERVICE,  DEBUGGER_SERVICE, SessionConfiguration, ModuleLoadingOptions, DkNotifyConstant, ExtraDebugFile } from "iar-vsc-common/thrift/bindings/cspy_types";
import { DebugEventListenerHandler } from "./debugEventListenerHandler";
import { CSpyContextService } from "./contexts/cspyContextService";
import { CSpyBreakpointService } from "./breakpoints/cspyBreakpointService";
import { LaunchArgumentConfigurationResolver}  from "./configresolution/launchArgumentConfigurationResolver";
import { CSpyException, DcResultConstant } from "iar-vsc-common/thrift/bindings/shared_types";
import { LIBSUPPORT_SERVICE } from "iar-vsc-common/thrift/bindings/libsupport_types";
import { LibSupportHandler } from "./libSupportHandler";
// There are no types for this library. We should probably look to replace it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Subject } from "await-notify";
import { CSpyDriver } from "./breakpoints/cspyDriver";
import { CommandRegistry } from "./commandRegistry";
import { Disposable, Utils } from "./utils";
import { CspyDisassemblyService } from "./cspyDisassemblyService";
import { CspyMemoryService } from "./cspyMemoryService";
import { CustomEvent, CustomRequest } from "./customRequest";
import { RegisterInformationService } from "./registerInformationService";
import { FrontendHandler } from "./frontendHandler";
import { FRONTEND_SERVICE } from "iar-vsc-common/thrift/bindings/frontend_types";
import { Workbench, WorkbenchType } from "iar-vsc-common/workbench";
import { TimelineFrontendHandler } from "./timelineFrontendHandler";
import { TIMELINE_FRONTEND_SERVICE } from "iar-vsc-common/thrift/bindings/timeline_types";
import { CSpyCoresService } from "./contexts/cspyCoresService";
import { CSpyRunControlService } from "./contexts/cspyRunControlService";
import { MulticoreProtocolExtension } from "./multicoreProtocolExtension";
import { BreakpointModeProtocolExtension } from "./breakpoints/breakpointModeProtocolExtension";
import { WorkbenchFeatures} from "iar-vsc-common/workbenchfeatureregistry";
import { ThriftServiceRegistryProcess } from "iar-vsc-common/thrift/thriftServiceRegistryProcess";
import { BreakpointModes } from "./breakpoints/breakpointMode";
import { ExceptionBreakpoints } from "./breakpoints/exceptionBreakpoint";
import { toInt64 } from "../utils";

export interface ExtraImage {
    /** The path to the image to load. */
    image: string,
    /** The offset to use.*/
    offset: string,
    /** Only download the debug info. */
    onlyDebugInfo: boolean
}

/**
 * This interface describes the cspy-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol), which the DAP client
 * should provide at launch (e.g. via a `launch.json` file).
 * The schema for these attributes lives in the package.json of this extension,
 * and this interface should always match that schema.
 */
export interface PartialCSpyLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    /** The name of the target in lower case (e.g. arm) */
    target: string;
    /** An absolute path to the "program" to debug. */
    program: string;
    /** @deprected use stopOnSymbol instead! Automatically stop target after launch. If not specified, target does not stop. */
    stopOnEntry?: boolean;
    /** A symbol for the debugger to run to when starting the debug session. Specify true to stop immediately after launch. Specify false to avoid stopping at all. */
    stopOnSymbol?: string | boolean;
    /** The mode of breakpoint to use by default. This is a hidden option; it isn't normally provided directly in the
    * launch.json (it's not declared in package.json). Instead, it is provided from the user's selection in the UI. */
    breakpointMode?: string,
    /** For multicore sessions, whether to enable lockstep mode (i.e. whether continue/step/pause should affect all cores, or
    * just the selected one). Hidden option, see above. */
    multicoreLockstepModeEnabled?: boolean;
    /** Enable logging the Debug Adapter Protocol */
    trace?: boolean;
    /** Path to the Embedded Workbench installation to use */
    workbenchPath: string;
    /** Path to the .ewp file of the project to debug */
    projectPath?: string;
    /** Name of the project configuration to debug (e.g. Debug) */
    projectConfiguration?: string;
    /** The name of the driver library to use.*/
    driver: string;
    /** The driver options as a list of string*/
    driverOptions: string[];
    /** A list of macros to load*/
    setupMacros?: string[];
    /** @deprecated Legacy alias for setupMacros, see VSC-306 */
    macros?: string[];
    /** Download options (optional, e.g. for simulator) */
    download?: {
        /** A board file specifying how to flash the device */
        flashLoader?: string;
        /** A list of devices macros to load before flashing */
        deviceMacros?: string[];
    }
    /** A list of plugins to load */
    plugins?: string[];
    /** A set of path mappings to use when resolving nonexistent source files */
    sourceFileMap?: Record<string, string>;
    /** For hardware sessions, ask the driver to not terminate the target when the debug sessions ends. */
    leaveTargetRunning?: boolean
    /** Not used by the debug adapter, only by the VS Code extension */
    buildBeforeDebugging?: string;
    /** Hidden option. Allows starting sessions with any target (although it might not work) */
    bypassTargetRestriction?: boolean;
    /** Hidden option. Enables the debug adapter to ask the client for a theme definition. This is
     * required to render listwindows properly, but can be disabled in tests.
     */
    enableThemeLookup?: boolean;
    /** Hidden option. Enables the debug adapter to ask the client for a initilizing listwindows. This is
     * required to render listwindows properly, but can be disabled in tests.
     */
    enableListWindowLookup?: boolean;

    extraImages?: ExtraImage[];
}

/**
 * Fields that are listed as optional in the package.json file and
 * {@link PartialCSpyLaunchRequestArguments} but must actually be defined to
 * start a session. This may be because their values may be filled in
 * automatically by one of the extension's config providers.
 */
type RequiredFields = "program" | "driver" | "driverOptions" | "target";
/**
 * The minimal arguments to start a debug session. While
 * {@link PartialCSpyLaunchRequestArguments} represents what VS Code will send us (i.e.
 * what VS Code's validation will allow), this type is stricter and represents
 * what we actually *require* to start a debug session.
 */
export type CSpyLaunchRequestArguments = PartialCSpyLaunchRequestArguments &
    Required<Pick<PartialCSpyLaunchRequestArguments, RequiredFields>>;


/**
 * The Attach request is basically the same as the launch request, but the not all fields are used.
 */
type PartialCSpyAttachRequestArguments = Omit<PartialCSpyLaunchRequestArguments, "stopOnEntry" | "stopOnSymbol">;

/**
 * Manages a debugging session between VS Code and C-SPY (via CSpyServer2)
 * This is the class that implements the Debug Adapter Protocol (at least the
 * parts that aren't already implemented by the DAP SDK).
 */
export class CSpyDebugSession extends LoggingDebugSession {

    // Resources to clean up on session end. We progressively build a stack of teardown actions when launching the
    // session, which allows the launch to be interrupted at any point and cleanly torn down.
    private readonly teardown = new Disposable.DisposableStack();

    // Various services that are initialized when launching a session (i.e. when handling a launch request)
    private services: undefined | {
        cspyProcess: ThriftServiceRegistryProcess;
        cspyDebugger: ThriftClient<Debugger.Client>;

        // Wrappers/abstractions around CSpyServer services
        coresService: CSpyCoresService;
        registerInfoService: RegisterInformationService;
        contextService: CSpyContextService;
        runControlService: CSpyRunControlService;
        breakpointService: CSpyBreakpointService;
        disassemblyService: CspyDisassemblyService;
        memoryService: CspyMemoryService;

        // Helpers for some of our DAP extensions
        breakpointModeExtension: BreakpointModeProtocolExtension;
        multicoreExtension?: MulticoreProtocolExtension;
    } = undefined;

    private readonly cspyEventHandler = new DebugEventListenerHandler();
    private readonly libSupportHandler = new LibSupportHandler();

    // Here, we can register actions to perform on e.g. receiving console commands, or custom dap requests
    private readonly consoleCommandRegistry: CommandRegistry<void, string> = new CommandRegistry();
    private readonly customRequestRegistry: CommandRegistry<unknown, unknown> = new CommandRegistry();

    private readonly configurationDone = new Subject();
    private readonly listwindowsDone = new Subject();

    // Need to keep track of this for when we initialize the breakpoint manager
    private clientLinesStartAt1 = false;
    private clientColumnsStartAt1 = false;

    private numCores = 1;

    /**
     * Creates a new debug adapter that is used for one debug session.
     */
    public constructor() {
        super();
        this.setDebuggerLinesStartAt1(true);
        this.setDebuggerColumnsStartAt1(true);
    }

    /**
     * The 'initialize' request is the first request called by the frontend
     * to interrogate the features the debug adapter provides.
     */
    protected override initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        // build and return the capabilities of this debug adapter:
        response.body = response.body || {};

        // the adapter implements the configurationDoneRequest.
        response.body.supportsConfigurationDoneRequest = true;

        // make VS Code use 'evaluate' when hovering over source
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsRestartRequest = true;
        response.body.supportsSetVariable = true;
        response.body.supportsSetExpression = true;
        response.body.supportsTerminateRequest = true;
        response.body.supportsSteppingGranularity = true;
        response.body.supportsCompletionsRequest = true;
        response.body.supportsDisassembleRequest = true;
        response.body.supportsInstructionBreakpoints = true;
        response.body.supportsReadMemoryRequest = true;
        response.body.supportsWriteMemoryRequest = true;
        response.body.supportsSingleThreadExecutionRequests = true;
        response.body.supportsConditionalBreakpoints = true;
        response.body.supportsHitConditionalBreakpoints = true;
        response.body.supportsDataBreakpoints = true;
        response.body.supportsLogPoints = true;
        response.body.breakpointModes = BreakpointModes.getBreakpointModes();
        response.body.exceptionBreakpointFilters = ExceptionBreakpoints.getExceptionFilters();

        this.clientLinesStartAt1 = args.linesStartAt1 || false;
        this.clientColumnsStartAt1 = args.columnsStartAt1 || false;

        if (!args.supportsInvalidatedEvent) {
            this.sendEvent(new OutputEvent("Client does not support invalidated event, setting variables may give inconsistent behaviour."));
        }

        this.sendResponse(response);
    }

    protected override configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments) {
        super.configurationDoneRequest(response, args);
        this.configurationDone.notify();
    }

    /**
     * This is responsible for setting up the entire session. This includes:
     * - Launching CSpyServer.
     * - Setting up our own thrift services (e.g. list window frontends and a debug event listener).
     * - Telling CSpyServer to load macros, flash and start the session.
     * - Connecting to necessary CSpyServer services (for breakpoints, context management and more).
     * - Setting up our DAP extension requests (see {@link CustomRequest}).
     */
    protected async startDebugSession(response: DebugProtocol.LaunchResponse | DebugProtocol.AttachResponse, args: PartialCSpyLaunchRequestArguments, isAttachRequest: boolean) {
        logger.init(e => this.sendEvent(e), undefined, true);
        logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Warn);

        function isDefined<T extends PartialCSpyLaunchRequestArguments, K extends keyof T>(args: T, field: K): args is T & Required<Pick<T, K>> {
            if (field in args) {
                return true;
            }
            response.success = false;
            response.message = `Missing required field '${field.toString()}'.`;
            return false;
        }
        if (!isDefined(args, "program")) {
            this.sendResponse(response);
            return;
        }
        if (!isDefined(args, "driver")) {
            this.sendResponse(response);
            return;
        }
        if (!isDefined(args, "driverOptions")) {
            this.sendResponse(response);
            return;
        }
        if (!isDefined(args, "target")) {
            this.sendResponse(response);
            return;
        }

        try {
            // -- Launch CSpyServer --
            const workbench = Workbench.create(args.workbenchPath);
            if (workbench === undefined) {
                throw new Error(`'${args.workbenchPath}' does not point to a valid IAR Embedded Workbench installation.`);
            }
            if (workbench.type === WorkbenchType.LEGACY_BX) {
                throw new Error(`'${workbench.name}' is an IAR Build Tools installation without debugging capabilities. Please use a newer IAR Build Tools version or a full IAR Embedded Workbench installation.`);
            }
            if (!WorkbenchFeatures.supportsFeature(workbench, WorkbenchFeatures.Debugging)) {
                const minVersions = WorkbenchFeatures.getMinProductVersions(workbench, WorkbenchFeatures.Debugging);
                this.sendEvent(new OutputEvent(`${workbench.name} does not officially support VS Code debugging. Please upgrade to ${minVersions.join(", ")} or later`, "stderr"));
            }
            // Cspyserver requires that we specify the number of cores as a command line argument, so we need to know it early
            const match = args.driverOptions.map(opt => opt.match(/--multicore_nr_of_cores=(\d+)/)).find(match => !!match);
            if (match && match[1]) {
                this.numCores = Number(match[1]);
            }

            // -- Launch all our thrift services so that they are available to CSpyServer --
            const cspyProcess = await CSpyServerLauncher.fromWorkbench(workbench.path, this.numCores);
            this.teardown.pushDisposable(cspyProcess);
            cspyProcess.addCrashHandler(code => {
                this.sendEvent(new OutputEvent(`The debugger backend crashed (code ${code}).`));
                this.sendEvent(new TerminatedEvent());
            });

            await cspyProcess.serviceRegistry.startService(DEBUGEVENT_SERVICE, DebugEventListener, this.cspyEventHandler);
            this.cspyEventHandler.observeLogEvents(event => {
                if (!event.text.endsWith("\n")) {
                    event.text += "\n";
                }
                this.sendEvent(new OutputEvent(event.text));
            });
            this.cspyEventHandler.observeDebugEvents(DkNotifyConstant.kDkFatalError, async() => {
                await this.endSession();
                this.sendEvent(new TerminatedEvent());
            });
            this.cspyEventHandler.observeDebugEvents(DkNotifyConstant.kDkSilentFatalError, async() => {
                await this.endSession();
                this.sendEvent(new TerminatedEvent());
            });

            this.libSupportHandler.observeOutput(data => {
                this.sendEvent(new OutputEvent(data, "stdout"));
            });
            this.libSupportHandler.observeExit(code => {
                this.sendEvent(new OutputEvent("Debugee terminated, exit code " + code + "\n"));
                this.sendEvent(new ExitedEvent(code));
            });
            this.libSupportHandler.observeInputRequest(() => {
                this.sendEvent(new OutputEvent("Debugee requested terminal input:"));
            });
            cspyProcess.serviceRegistry.startService(LIBSUPPORT_SERVICE, LibSupportService2, this.libSupportHandler);

            const frontendHandler = new FrontendHandler(this, args.sourceFileMap ?? {}, args.enableThemeLookup ?? false, this.customRequestRegistry);
            this.teardown.pushDisposable(frontendHandler);
            cspyProcess.serviceRegistry.startService(FRONTEND_SERVICE, Frontend, frontendHandler);
            const timelineFrontendHandler = new TimelineFrontendHandler();
            cspyProcess.serviceRegistry.startService(TIMELINE_FRONTEND_SERVICE, TimelineFrontend, timelineFrontendHandler);

            // -- Start the CSpyServer session (incl. loading macros & flashing) --
            const sessionConfig: SessionConfiguration = await new LaunchArgumentConfigurationResolver().resolveLaunchArguments(args);
            const cspyDebugger = await cspyProcess.serviceRegistry.findService(DEBUGGER_SERVICE, Debugger);
            this.teardown.pushFunction(() => cspyDebugger.close());
            this.sendEvent(new OutputEvent("Using C-SPY version: " + await cspyDebugger.service.getVersionString() + "\n"));

            await cspyDebugger.service.startSession(sessionConfig);
            if (await cspyDebugger.service.supportsExceptions())
                await cspyDebugger.service.setBreakOnThrow(true);

            if (args.download) {
                await Utils.loadMacros(cspyDebugger.service, args.download.deviceMacros ?? []);
                if (!isAttachRequest && args.download.flashLoader) {
                    await cspyDebugger.service.flashModule(args.download.flashLoader, sessionConfig.executable, [], []);
                }
            }


            if (args.leaveTargetRunning && !WorkbenchFeatures.supportsFeature(workbench, WorkbenchFeatures.LeaveTargetRunning, args.target)) {
                this.sendEvent(new OutputEvent("Leave target running requires C-SPY version " + WorkbenchFeatures.LeaveTargetRunning.baseVersion.join(".") + "\n"));
            }

            // Setup the module loading options, which is basically just
            // based on whether we're attaching or not.
            const moduleOptions = new ModuleLoadingOptions();
            moduleOptions.extraDebugFiles = [];
            args.extraImages?.forEach((extraImage: ExtraImage) => {
                const extraFile = new ExtraDebugFile();
                extraFile.offset = toInt64(extraImage.offset);
                extraFile.doDownload = extraImage.onlyDebugInfo;
                extraFile.path = extraImage.image;
                moduleOptions.extraDebugFiles.push(extraFile);
            });
            moduleOptions.shouldAttach = isAttachRequest;
            moduleOptions.onlyPrefixNotation = false; // Always false.
            moduleOptions.shouldLeaveRunning = args.leaveTargetRunning?? false;

            moduleOptions.callUserMacros = !isAttachRequest;
            moduleOptions.resetAfterLoad = !isAttachRequest;
            moduleOptions.suppressDownload = isAttachRequest;

            await Utils.loadMacros(cspyDebugger.service, sessionConfig.setupMacros);
            await cspyDebugger.service.loadModuleWithOptions(args.program, moduleOptions);

            // -- Connect to CSpyServer services --
            // note that some services (most listwindows) are launched by loadModule, so we *have* to do this afterwards
            const coresService = await CSpyCoresService.instantiate(cspyProcess.serviceRegistry);
            this.teardown.pushDisposable(coresService);

            const registerInfoGenerator = new RegisterInformationService(args.driverOptions, await cspyProcess.serviceRegistry.findService(DEBUGGER_SERVICE, Debugger));
            const contextService = await CSpyContextService.instantiate(cspyProcess.serviceRegistry, coresService, registerInfoGenerator, this.cspyEventHandler);
            this.teardown.pushDisposable(contextService);

            const runControlService = await CSpyRunControlService.instantiate(cspyProcess.serviceRegistry, coresService, this.cspyEventHandler, this.libSupportHandler);
            this.teardown.pushDisposable(runControlService);
            runControlService.onCoreStopped(stoppedEvents => {
                // Prefer to batch all events into a single one with the 'allThreadsStopped' flag, since it allows
                // controlling which core is focused. There is a proposal here for improving the ability to batch stopped events:
                // https://github.com/microsoft/debug-adapter-protocol/issues/161
                if (stoppedEvents.length === this.numCores) {
                    const focusedCore = stoppedEvents.find(ev => ev.stoppedDeliberately) ?? stoppedEvents[0];
                    if (focusedCore) this.sendStoppedEvent(focusedCore.core, focusedCore.reason, true);
                } else {
                    // Try to force the correct UI focus by sending cores that stopped deliberately last
                    stoppedEvents.sort((ev1, ev2) => Number(ev1.stoppedDeliberately) - Number(ev2.stoppedDeliberately)).forEach(ev => {
                        this.sendStoppedEvent(ev.core, ev.reason, false);
                    });
                }
            });

            const memoryManager = await CspyMemoryService.instantiate(cspyProcess.serviceRegistry);
            this.teardown.pushDisposable(memoryManager);
            const disassemblyManager = await CspyDisassemblyService.instantiate(cspyProcess.serviceRegistry,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1);
            this.teardown.pushDisposable(disassemblyManager);

            const driver = CSpyDriver.driverFromName(args.driver, args.target, args.driverOptions);
            const breakpointManager = await CSpyBreakpointService.instantiate(cspyProcess.serviceRegistry,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1,
                driver, (event: OutputEvent) => {
                    this.sendEvent(event);
                });
            this.teardown.pushDisposable(breakpointManager);

            // --- Set up custom DAP requests ---
            this.customRequestRegistry.registerCommand(
                CustomRequest.Names.GET_REGISTRY_LOCATION,
                () => cspyProcess.serviceRegistry.registryLocation,
            );
            const breakpointModeExtension = new BreakpointModeProtocolExtension(
                breakpointManager,
                this,
                args.breakpointMode && BreakpointModes.isBreakpointMode(args.breakpointMode) ? args.breakpointMode : undefined,
                this.customRequestRegistry,
                this.consoleCommandRegistry);
            this.customRequestRegistry.registerCommand(CustomRequest.Names.REGISTERS, async(): Promise<CustomRequest.RegistersResponse> => {
                return { svdContent: await registerInfoGenerator.getSvdXml() };
            });

            // Set up change view formats queries
            this.customRequestRegistry.registerCommandWithTypeCheck(
                CustomRequest.Names.CHANGE_VIEW_FORMAT_REQUEST,
                CustomRequest.isChangeVariableViewFormatArgs,
                async args => {
                    if (await contextService.setViewFormat(args)) {
                        this.sendEvent(new InvalidatedEvent(["variables"]));
                    }
                },
            );

            let multicoreExtension: MulticoreProtocolExtension | undefined = undefined;
            if (this.numCores > 1) {
                multicoreExtension = new MulticoreProtocolExtension(args.multicoreLockstepModeEnabled ?? true, this.customRequestRegistry);
            }

            // -- Launch all the listwindows --
            // This needs to be done before starting the target to avoid
            // any collisions with the state of the core when setting up
            // the listwindows.

            // Register a callback to the listwindow setup completion.
            this.customRequestRegistry.registerCommand(
                CustomRequest.Names.LISTWINDOWS_RESOLVED,
                () => {
                    this.listwindowsDone.notify();
                },
            );
            const body: CustomEvent.ListWindowsRequestedData = {
                supportsToolbars: WorkbenchFeatures.supportsFeature(
                    workbench,
                    WorkbenchFeatures.GenericToolbars,
                    args.target,
                ),
            };
            this.sendEvent(
                new Event(CustomEvent.Names.LISTWINDOWS_REQUESTED, body),
            );
            if (args.enableListWindowLookup) {
                await this.listwindowsDone.wait();
            }

            // -- Store everything needed to be able to handle requests --
            this.services = {
                cspyProcess,
                cspyDebugger,
                coresService,
                registerInfoService: registerInfoGenerator,
                contextService,
                runControlService,
                breakpointService: breakpointManager,
                disassemblyService: disassemblyManager,
                memoryService: memoryManager,
                multicoreExtension,
                breakpointModeExtension: breakpointModeExtension,
            };
            this.teardown.pushFunction(() => (this.services = undefined));
        } catch (e) {
            await this.endSession();
            response.success = false;
            if (typeof e === "string" || e instanceof Error) {
                response.message = e.toString();
            }
            if (e instanceof CSpyException) {
                response.message += ` (${e.culprit})`;
            }
            this.sendResponse(response);
            return;
        }

        // Setup is done. Tell the client we are ready to receive configuration requests (e.g. breakpoints).
        this.sendEvent(new InitializedEvent());
        await this.configurationDone.wait(1000);

        this.sendEvent(new OutputEvent("Session started\n"));
        this.sendResponse(response);

        this.services.contextService.onInspectionContextChanged(frame => {
            const body: CustomEvent.ContextChangedData = {
                file: frame.source,
                startLine: this.convertDebuggerLineToClient(frame.startLine),
                startColumn: this.convertDebuggerColumnToClient(frame.startColumn),
                endLine: this.convertDebuggerLineToClient(frame.endLine),
                endColumn: this.convertDebuggerColumnToClient(frame.endColumn),
            };
            this.sendEvent(new Event(CustomEvent.Names.CONTEXT_CHANGED, body));
        });

        // Perform any initial run-to action if needed
        let doStop: boolean;
        let stopSymbol: string | undefined = undefined;
        if (typeof(args.stopOnSymbol) === "string") {
            doStop = true;
            stopSymbol = args.stopOnSymbol;
        } else if (args.stopOnSymbol === false) {
            doStop = false;
        } else if (args.stopOnSymbol === true) {
            doStop = true;
        } else if (args.stopOnEntry) {
            doStop = true;
            stopSymbol = "main";
        } else {
            doStop = false;
        }
        if (doStop) {
            if (stopSymbol) {
                await this.services?.runControlService.runToULE(undefined, stopSymbol);
            } else {
                // Use the initial entry state. Since no coreStopped event will be emitted, we must notify the client
                // here that all cores are stopped.
                this.sendStoppedEvent(0, "entry", true);
            }
        } else {
            await this.services?.runControlService.continue(undefined);
        }
    }

    protected override async launchRequest(response: DebugProtocol.LaunchResponse, args: PartialCSpyLaunchRequestArguments) {
        await this.startDebugSession(response, args, false);
    }

    protected override async attachRequest(response: DebugProtocol.AttachResponse, args: PartialCSpyAttachRequestArguments) {
        // We convert the attach request into a CSpyLaunchRequestArguments with some special options.
        const launchArgs: CSpyLaunchRequestArguments = {
            ...args,
            stopOnEntry: false,
            stopOnSymbol: undefined,
        };

        await this.startDebugSession(response, launchArgs, true);
    }

    protected override async terminateRequest(response: DebugProtocol.TerminateResponse, _args: DebugProtocol.TerminateArguments) {
        this.sendResponse(response);
        try {
            this.sendEvent(new OutputEvent("Shutting down C-SPY...\n"));
            await this.endSession();
        } catch (e) {
            if (e instanceof Error || typeof(e) === "string") {
                logger.error(e.toString());
            }
        }
        this.sendEvent(new TerminatedEvent());
    }
    protected override async disconnectRequest(response: DebugProtocol.DisconnectResponse, _args: DebugProtocol.DisconnectArguments) {
        await this.endSession();
        this.sendResponse(response);
    }

    protected override async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments) {
        await this.tryWithServices(response, async services => {
            // The DAP pause request doesn't support singleThread yet, so we pretend it does for the purpose of being
            // able to control the lockstep mode (see MulticoreProtocolExtension).
            const newArgs: typeof args & { singleThread?: boolean } = args;
            services.multicoreExtension?.massageExecutionRequest(newArgs, response);
            await services.runControlService.pause(newArgs.singleThread ? newArgs.threadId : undefined);
        });
        this.sendResponse(response);
    }
    protected override async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
        await this.tryWithServices(response, async(services) => {
            services.multicoreExtension?.massageExecutionRequest(args, response);
            await services.runControlService.continue(args.singleThread ? args.threadId : undefined);
        });
        this.sendResponse(response);
    }

    protected override async restartRequest(response: DebugProtocol.RestartResponse, _args: DebugProtocol.RestartArguments) {
        await this.tryWithServices(response, async services => {
            await services.runControlService.reset();
        });
        this.sendResponse(response);
    }

    protected override async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
        await this.tryWithServices(response, async(services) => {
            services.multicoreExtension?.massageExecutionRequest(args, response);
            await services.runControlService.next(args.singleThread ? args.threadId : undefined, args.granularity);
        });
        this.sendResponse(response);
    }

    protected override async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
        await this.tryWithServices(response, async(services) => {
            services.multicoreExtension?.massageExecutionRequest(args, response);
            await services.runControlService.stepIn(args.singleThread ? args.threadId : undefined, args.granularity);
        });
        this.sendResponse(response);
    }

    protected override async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
        await this.tryWithServices(response, services => {
            services.multicoreExtension?.massageExecutionRequest(args, response);
            return services.runControlService.stepOut(args.singleThread ? args.threadId : undefined);
        });
        this.sendResponse(response);
    }
    protected override async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
        let failedRemovals: DebugProtocol.SourceBreakpoint[] = [];
        await this.tryWithServices(response, async(services) => {
            const [bps, fbps] = await services.breakpointService.setBreakpointsFor(args.source, args.breakpoints ?? []);
            failedRemovals = fbps;
            response.body = {
                breakpoints: bps,
            };
        });

        this.sendResponse(response);

        if (failedRemovals.length > 0 && args.source.path) {
            const body: CustomEvent.MissingBreakpoints = {
                srcPath: args.source.path,
                breakpoints: failedRemovals,
                type: "source"
            };
            this.sendEvent(new Event(CustomEvent.Names.MISSING_BREAKPOINTS, body));
        }
    }
    protected override async setInstructionBreakpointsRequest(response: DebugProtocol.SetInstructionBreakpointsResponse, args: DebugProtocol.SetInstructionBreakpointsArguments) {
        let failedRemovals: DebugProtocol.InstructionBreakpoint[] = [];
        await this.tryWithServices(response, async(services) => {
            const [bps, fbps]  = await services.breakpointService.setInstructionBreakpoints(args.breakpoints);
            failedRemovals = fbps;
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);

        if (failedRemovals.length > 0) {
            const body: CustomEvent.MissingBreakpoints = {
                breakpoints: failedRemovals,
                type: "instruction"
            };
            this.sendEvent(new Event(CustomEvent.Names.MISSING_BREAKPOINTS, body));
        }
    }
    protected override async setDataBreakpointsRequest(response: DebugProtocol.SetDataBreakpointsResponse, args: DebugProtocol.SetDataBreakpointsArguments) {
        let failedRemovals: DebugProtocol.DataBreakpoint[] = [];
        await this.tryWithServices(response, async services => {
            const [bps, fbps]  = await services.breakpointService.setDataBreakpoints(args.breakpoints);
            failedRemovals = fbps;
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);

        if (failedRemovals.length > 0) {
            const body: CustomEvent.MissingBreakpoints = {
                breakpoints: failedRemovals,
                type: "data"
            };
            this.sendEvent(new Event(CustomEvent.Names.MISSING_BREAKPOINTS, body));
        }
    }
    protected override async dataBreakpointInfoRequest(response: DebugProtocol.DataBreakpointInfoResponse, args: DebugProtocol.DataBreakpointInfoArguments) {
        await this.tryWithServices(response, async services => {
            if (args.variablesReference === undefined) {
                throw new Error("Cannot find variable without a scope");
            }
            const vars = await services.contextService.fetchVariables(args.variablesReference);
            const variable = vars.find(v => v.name === args.name);
            if (!variable) {
                throw new Error("No such variable found");
            }
            const accessTypes = services.breakpointService.supportedDataBreakpointAccessTypes();
            if (accessTypes !== undefined && accessTypes.length > 0) {
                response.body = {
                    dataId: variable.evaluateName ?? null,
                    description: variable.name,
                    accessTypes,
                    canPersist: true,
                };
            }
        });
        this.sendResponse(response);
    }
    protected override async setExceptionBreakPointsRequest(response: DebugProtocol.SetExceptionBreakpointsResponse, args: DebugProtocol.SetExceptionBreakpointsArguments) {
        await this.tryWithServices(response, async services => {
            await ExceptionBreakpoints.setEnabledExceptionFilters(
                args.filters, services.cspyDebugger.service);
        });
        this.sendResponse(response);
    }


    protected override async threadsRequest(response: DebugProtocol.ThreadsResponse) {
        await this.tryWithServices(response, async services => {
            const nCores = await services.cspyDebugger.service.getNumberOfCores();
            const threads: Thread[] = [];
            for (let i = 0; i < nCores; i++) {
                const description = await services.cspyDebugger.service.getCoreDescription(i);
                threads.push(new Thread(i, `${i}: ${description}`));
            }
            response.body = {
                threads,
            };
        });
        this.sendResponse(response);
    }

    protected override async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
        await this.tryWithServices(response, async services => {
            const frames = await services.contextService.fetchStackFrames(args.threadId, args.startFrame ?? 0, args.levels);
            response.body = {
                stackFrames: frames,
            };
        });
        this.sendResponse(response);
    }

    protected override async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
        await this.tryWithServices(response, services => {
            const scopes = services.contextService.fetchScopes(args.frameId);
            response.body = {
                scopes: scopes,
            };
        });
        this.sendResponse(response);
    }

    protected override async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
        await this.tryWithServices(response, async services => {
            const variables = await services.contextService.fetchVariables(args.variablesReference);
            response.body = {
                variables: variables,
            };
        });
        this.sendResponse(response);
    }

    protected override async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments) {
        await this.tryWithServices(response, async services => {
            const { newValue, changedAddress } = await services.contextService.setVariable(args.variablesReference, args.name, args.value);
            response.body = {
                value: newValue
            };
            // Notify the client that some memory changed
            if (changedAddress) {
                this.sendEvent(new Event("memory", {
                    memoryReference: changedAddress,
                    offset: 0,
                    count: 1024, // We don't know the size, so just update a big chunk
                }));
            }
        });
        this.sendResponse(response);
        // When changing a variable, other variables pointing to the same memory may change, so force the UI to reload all variables
        this.sendEvent(new InvalidatedEvent(["variables"]));
    }


    protected override async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments) {
        if (args.context === "repl" && this.libSupportHandler.isExpectingInput()) {
            this.libSupportHandler.sendInput(Buffer.from(args.expression + "\n", "utf-8"));
            response.body = {
                result: args.expression,
                variablesReference: 0,
            };
        } else if (args.context === "repl" && this.consoleCommandRegistry.hasCommand(args.expression)) {
            try {
                const res = await this.consoleCommandRegistry.runCommand(args.expression);
                if (res) {
                    this.sendEvent(new OutputEvent(res));
                }
            } catch (e) {
                response.success = false;
                if (e instanceof Error) {
                    response.message = e.message;
                }
            }
        } else {
            await this.tryWithServices(response, async services => {
                const result = await services.contextService.evalExpression(args.frameId, args.expression);
                response.body = {
                    result: result.value,
                    ...result,
                };
            });
        }
        this.sendResponse(response);
    }

    protected override async setExpressionRequest(response: DebugProtocol.SetExpressionResponse, args: DebugProtocol.SetExpressionArguments) {
        await this.tryWithServices(response, async services => {
            const { newValue, changedAddress } = await services.contextService.setExpression(args.frameId, args.expression, args.value);
            response.body = {
                value: newValue
            };
            // Notify the client that some memory changed
            if (changedAddress) {
                this.sendEvent(new Event("memory", {
                    memoryReference: changedAddress,
                    offset: 0,
                    count: 1024, // We don't know the size, so just update a big chunk
                }));
            }
        });
        this.sendResponse(response);
        // When changing a variable, other variables pointing to the same memory may change, so force the UI to reload all variables
        this.sendEvent(new InvalidatedEvent(["variables"]));
    }

    protected override async disassembleRequest(response: DebugProtocol.DisassembleResponse, args: DebugProtocol.DisassembleArguments, _request?: DebugProtocol.Request) {
        await this.tryWithServices(response, async services => {
            const instructions = await services.disassemblyService.fetchDisassembly(args.memoryReference, args.instructionCount, args.offset, args.instructionOffset);
            response.body = {
                instructions,
            };
        });

        this.sendResponse(response);
    }

    protected override completionsRequest(response: DebugProtocol.CompletionsResponse, _args: DebugProtocol.CompletionsArguments) {
        const targets: DebugProtocol.CompletionItem[] = this.consoleCommandRegistry.commandNames.map(name => {
            return { label: name, type: "property" };
        });
        response.body = {
            targets: targets
        };
        response.success = true;
        this.sendResponse(response);
    }

    protected override async readMemoryRequest(response: DebugProtocol.ReadMemoryResponse, args: DebugProtocol.ReadMemoryArguments) {
        await this.tryWithServices(response, async services => {
            const result = await services.memoryService.readMemory(args.memoryReference.replace("'", ""), args.offset ?? 0, args.count);
            response.body = {
                address: "0x" + result.addr.toOctetString(),
                data: result.data,
                unreadableBytes: args.count - result.count,
            };
        });
        this.sendResponse(response);
    }
    protected override async writeMemoryRequest(response: DebugProtocol.WriteMemoryResponse, args: DebugProtocol.WriteMemoryArguments) {
        await this.tryWithServices(response, async services => {
            const bytesWritten = await services.memoryService.writeMemory(args.memoryReference.replace("'", ""), args.offset ?? 0, args.data);
            response.body = {
                bytesWritten: bytesWritten,
                offset: 0,
            };
        });
        this.sendResponse(response);
        // This memory may be used by a variable, so refresh all variables
        this.sendEvent(new InvalidatedEvent(["variables"]));
    }

    protected override async customRequest(command: string, response: DebugProtocol.Response, args: unknown) {
        if (this.customRequestRegistry.hasCommand(command)) {
            try {
                const result = await this.customRequestRegistry.runCommand(command, args);
                response.body = result;
            } catch (e) {
                response.success = false;
                response.message = e instanceof Error ? e.message : undefined;
            }
        } else {
            response.success = false;
        }
        this.sendResponse(response);
    }

    private async endSession() {
        await this.teardown.disposeAll();
    }

    /**
     * Performs some standard error handling around a DAP request.
     * Most request handling should be wrapped with this method to check that the 'services' member has been initialized
     * (i.e. that we are in a launched session) and to handle exceptions gracefully.
     * @param response The response to modify with the request results (in case an error is thrown)
     * @param fun The function to run to handle the request
     */
    private async tryWithServices(response: DebugProtocol.Response, fun: (services: NonNullable<CSpyDebugSession["services"]>) => void | Promise<void>) {
        try {
            if (this.services === undefined) {
                throw new Error("Not yet initialized, send a launch request first");
            }
            await fun(this.services);
        } catch (e) {
            response.success = false;
            // Usually the backend threw a CSpyException, so let's put some effort
            // into making these look nice.
            if (e instanceof CSpyException) {
                if (e.message) {
                    response.message = e.message;
                } else if (e.code === DcResultConstant.kDcUnavailable) {
                    response.message = "<unavailable>";
                } else {
                    response.message = `Error: ${DcResultConstant[e.code]?.substring(3)}, method: ${e.method}, culprit: ${e.culprit}`;
                }
                logger.error(response.message);
            } else if (typeof e === "string" || e instanceof Error) {
                response.message = e.toString();
                logger.error(e.toString());
            }
        }
    }

    /**
     * Helper for sending a stoppedEvent with the 'allThreadsStopped' flag. It hasn't made it into the node debug
     * adapter library yet, so we can't simply use 'new StoppedEvent()'.
     */
    private sendStoppedEvent(threadId: number, reason: string, allThreadsStopped: boolean) {
        const eventBody: DebugProtocol.StoppedEvent["body"] = {
            reason,
            threadId,
            allThreadsStopped,
        };
        this.sendEvent(new Event("stopped", eventBody));
    }
}
