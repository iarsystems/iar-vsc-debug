/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DebugProtocol } from "@vscode/debugprotocol";
import { CSpyServerServiceManager } from "./thrift/cspyServerServiceManager";
import { ThriftServiceManager } from "iar-vsc-common/thrift/thriftServiceManager";
import { LoggingDebugSession,  StoppedEvent, OutputEvent, InitializedEvent, logger, Logger, Thread, TerminatedEvent, InvalidatedEvent, Event, ExitedEvent } from "@vscode/debugadapter";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import * as DebugEventListener from "iar-vsc-common/thrift/bindings/DebugEventListener";
import * as LibSupportService2 from "iar-vsc-common/thrift/bindings/LibSupportService2";
import * as Frontend from "iar-vsc-common/thrift/bindings/Frontend";
import * as TimelineFrontend from "iar-vsc-common/thrift/bindings/TimelineFrontend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { DEBUGEVENT_SERVICE,  DEBUGGER_SERVICE, SessionConfiguration } from "iar-vsc-common/thrift/bindings/cspy_types";
import { DebugEventListenerHandler } from "./debugEventListenerHandler";
import { CSpyContextService } from "./contexts/cspyContextService";
import { BreakpointType, CSpyBreakpointService } from "./breakpoints/cspyBreakpointService";
import { LaunchArgumentConfigurationResolver}  from "./configresolution/launchArgumentConfigurationResolver";
import { CSpyException } from "iar-vsc-common/thrift/bindings/shared_types";
import { LIBSUPPORT_SERVICE } from "iar-vsc-common/thrift/bindings/libsupport_types";
import { LibSupportHandler } from "./libSupportHandler";
// There are no types for this library. We should probably look to replace it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Subject } from "await-notify";
import { CSpyDriver } from "./breakpoints/cspyDriver";
import { CommandRegistry } from "./commandRegistry";
import { Utils } from "./utils";
import { CspyDisassemblyService } from "./cspyDisassemblyService";
import { CspyMemoryService } from "./cspyMemoryService";
import { CustomRequest } from "./customRequest";
import { RegisterInformationService } from "./registerInformationService";
import { FrontendHandler } from "./frontendHandler";
import { FRONTEND_SERVICE } from "iar-vsc-common/thrift/bindings/frontend_types";
import { Workbench, WorkbenchType } from "iar-vsc-common/workbench";
import { TimelineFrontendHandler } from "./timelineFrontendHandler";
import { TIMELINE_FRONTEND_SERVICE } from "iar-vsc-common/thrift/bindings/timeline_types";
import { CSpyCoresService } from "./contexts/cspyCoresService";
import { CSpyRunControlService } from "./contexts/cspyRunControlService";
import { BreakpointTypeProtocolExtension } from "./breakpoints/breakpointTypeProtocolExtension";

/**
 * This interface describes the cspy-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol), which the DAP client
 * should provide at launch (e.g. via a `launch.json` file).
 * The schema for these attributes lives in the package.json of this extension,
 * and this interface should always match that schema.
 */
export interface CSpyLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    /** The name of the target in lower case (e.g. arm) */
    target: string;
    /** An absolute path to the "program" to debug. */
    program: string;
    /** @deprected use stopOnSymbol instead! Automatically stop target after launch. If not specified, target does not stop. */
    stopOnEntry?: boolean;
    /** A symbol for the debugger to run to when starting the debug session. Specify true to stop immediately after launch. Specify false to avoid stopping at all. */
    stopOnSymbol?: string | boolean;
    /** The type of breakpoint to use by default. This is a hidden option; it isn't normally provided directly in the
    * launch.json (it's not declared in package.json). Instead, it is provided from the user's selection in the UI. */
    breakpointType?: BreakpointType;
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
    /** Hidden option. Allows starting sessions with any target (although it might not work) */
    bypassTargetRestriction?: boolean;
}

/**
 * Manages a debugging session between VS Code and C-SPY (via CSpyServer2)
 * This is the class that implements the Debug Adapter Protocol (at least the
 * parts that aren't already implemented by the DAP SDK).
 */
export class CSpyDebugSession extends LoggingDebugSession {

    // Various services that are initialized when launching a session (i.e. when handling a launch request)
    private services: undefined | {
        serviceManager: ThriftServiceManager;
        cspyDebugger: ThriftClient<Debugger.Client>;

        // Wrappers/abstractions around CSpyServer services
        registerInfoService: RegisterInformationService;
        contextService: CSpyContextService;
        runControlService: CSpyRunControlService;
        breakpointService: CSpyBreakpointService;
        disassemblyService: CspyDisassemblyService;
        memoryService: CspyMemoryService;

        // Helpers for some of our DAP extensions
        breakpointTypeExtension: BreakpointTypeProtocolExtension;
    } = undefined;

    private readonly cspyEventHandler = new DebugEventListenerHandler();
    private readonly libSupportHandler = new LibSupportHandler();

    // Here, we can register actions to perform on e.g. receiving console commands, or custom dap requests
    private readonly consoleCommandRegistry: CommandRegistry<void, string> = new CommandRegistry();
    private readonly customRequestRegistry: CommandRegistry<unknown, unknown> = new CommandRegistry();

    private readonly configurationDone = new Subject();

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
    protected override async launchRequest(response: DebugProtocol.LaunchResponse, args: CSpyLaunchRequestArguments) {
        logger.init(e => this.sendEvent(e), undefined, true);
        logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop);

        try {
            // -- Launch CSpyServer --
            const workbench = Workbench.create(args.workbenchPath);
            if (workbench === undefined) {
                throw new Error(`'${args.workbenchPath}' does not point to a valid IAR Embedded Workbench installation.`);
            }
            if (workbench.type === WorkbenchType.BX) {
                throw new Error(`'${workbench.name}' is an IAR Build Tools installation. Debugging is only supported for full IAR Embedded Workbench installations.`);
            }
            // Cspyserver requires that we specify the number of cores as a command line argument, so we need to know it early
            const match = args.driverOptions.map(opt => opt.match(/--multicore_nr_of_cores=(\d+)/)).find(match => !!match);
            if (match && match[1]) {
                this.numCores = Number(match[1]);
            }

            // -- Launch all our thrift services so that they are available to CSpyServer --
            const serviceManager = await CSpyServerServiceManager.fromWorkbench(workbench.path, this.numCores);
            serviceManager.addCrashHandler(code => {
                this.sendEvent(new OutputEvent(`The debugger backend crashed (code ${code}).`));
                this.sendEvent(new TerminatedEvent());
            });

            await serviceManager.startService(DEBUGEVENT_SERVICE, DebugEventListener, this.cspyEventHandler);
            this.cspyEventHandler.observeLogEvents(event => {
                if (!event.text.endsWith("\n")) {
                    event.text += "\n";
                }
                this.sendEvent(new OutputEvent(event.text));
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
            serviceManager.startService(LIBSUPPORT_SERVICE, LibSupportService2, this.libSupportHandler);

            const frontendHandler = new FrontendHandler(this, args.sourceFileMap ?? {}, this.customRequestRegistry);
            serviceManager.startService(FRONTEND_SERVICE, Frontend, frontendHandler);
            const timelineFrontendHandler = new TimelineFrontendHandler();
            this.serviceManager.startService(TIMELINE_FRONTEND_SERVICE, TimelineFrontend, timelineFrontendHandler);

            // -- Start the CSpyServer session (incl. loading macros & flashing) --
            const sessionConfig: SessionConfiguration = await new LaunchArgumentConfigurationResolver().resolveLaunchArguments(args);
            const cspyDebugger = await serviceManager.findService(DEBUGGER_SERVICE, Debugger);
            this.sendEvent(new OutputEvent("Using C-SPY version: " + await cspyDebugger.service.getVersionString() + "\n"));

            await this.cspyDebugger.service.startSession(sessionConfig);
            const driver = CSpyDriver.driverFromName(args.driver, args.target, args.driverOptions);

            if (args.download) {
                await Utils.loadMacros(cspyDebugger.service, args.download.deviceMacros ?? []);
                if (args.download.flashLoader) {
                    await this.cspyDebugger.service.flashModule(args.download.flashLoader, sessionConfig.executable, [], []);
                }
            }
            await Utils.loadMacros(cspyDebugger.service, sessionConfig.setupMacros ?? []);
            await cspyDebugger.service.loadModule(args.program);

            // -- Connect to CSpyServer services --
            // note that some services (most listwindows) are launched by loadModule, so we *have* to do this afterwards
            const registerInfoGenerator = new RegisterInformationService(args.driverOptions, await serviceManager.findService(DEBUGGER_SERVICE, Debugger));
            await CSpyCoresService.initialize(serviceManager);
            const stackManager = await CSpyContextService.instantiate(serviceManager, registerInfoGenerator);
            const runControlService = await CSpyRunControlService.instantiate(serviceManager, this.cspyEventHandler, this.libSupportHandler);
            runControlService.onCoreStopped((core, reason) => {
                this.sendEvent(new StoppedEvent(reason, core));
            });
            const memoryManager = await CspyMemoryService.instantiate(serviceManager);
            const disassemblyManager = await CspyDisassemblyService.instantiate(serviceManager,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1);

            const driver = CSpyDriver.driverFromName(args.driver, args.target, args.driverOptions);
            const breakpointManager = await CSpyBreakpointService.instantiate(serviceManager,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1,
                driver);

            // --- Set up custom DAP requests ---
            const breakpointTypeExtension = new BreakpointTypeProtocolExtension(driver, this, args.breakpointType,
                this.customRequestRegistry, this.consoleCommandRegistry);
            this.customRequestRegistry.registerCommand(CustomRequest.Names.REGISTERS, async(): Promise<CustomRequest.RegistersResponse> => {
                return { svdContent: await registerInfoGenerator.getSvdXml() };
            });

            // -- Store everything needed to be able to handle requests --
            this.services = {
                serviceManager,
                cspyDebugger,
                registerInfoService: registerInfoGenerator,
                contextService: stackManager,
                runControlService,
                breakpointService: breakpointManager,
                disassemblyService: disassemblyManager,
                memoryService: memoryManager,
                breakpointTypeExtension,
            };

        } catch (e) {
            response.success = false;
            if (typeof e === "string" || e instanceof Error) {
                response.message = e.toString();
            }
            if (e instanceof CSpyException) {
                response.message += ` (${e.culprit})`;
            }
            this.sendResponse(response);
            await this.endSession();
            return;
        }

        // Setup is done. Tell the client we are ready to receive configuration requests (e.g. breakpoints).
        this.sendEvent(new InitializedEvent());
        await this.configurationDone.wait(1000);

        this.sendEvent(new OutputEvent("Session started\n"));
        this.sendResponse(response);

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
                await this.services.runControlService.runToULE(undefined, stopSymbol);
            } else {
                // Use the initial entry state. Since no coreStopped event will be emitted, we must notify the client
                // here that all cores are stopped.
                const eventBody: DebugProtocol.StoppedEvent["body"] = {
                    reason: "entry",
                    threadId: 0,
                    allThreadsStopped: true,
                };
                this.sendEvent(new Event("stopped", eventBody));
            }
        } else {
            await this.services.runControlService.continue(undefined);
        }
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
            await services.runControlService.pause(args.threadId);
        });
        this.sendResponse(response);
    }
    protected override async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
        await this.tryWithServices(response, async(services) => {
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
            await services.runControlService.next(args.singleThread ? args.threadId : undefined, args.granularity);
        });
        this.sendResponse(response);
    }

    protected override async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
        await this.tryWithServices(response, async(services) => {
            await services.runControlService.stepIn(args.singleThread ? args.threadId : undefined, args.granularity);
        });
        this.sendResponse(response);
    }

    protected override async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
        await this.tryWithServices(response, services => {
            return services.runControlService.stepOut(args.singleThread ? args.threadId : undefined);
        });
        this.sendResponse(response);
    }

    protected override async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
        await this.tryWithServices(response, async(services) => {
            const bps = await services.breakpointService.setBreakpointsFor(args.source, args.breakpoints ?? [],
                services.breakpointTypeExtension.getBreakpointType());
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);
    }
    protected override async setInstructionBreakpointsRequest(response: DebugProtocol.SetInstructionBreakpointsResponse, args: DebugProtocol.SetInstructionBreakpointsArguments) {
        await this.tryWithServices(response, async(services) => {
            const bps = await services.breakpointService.setInstructionBreakpoints(args.breakpoints,
                services.breakpointTypeExtension.getBreakpointType());
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);
    }
    protected override async setDataBreakpointsRequest(response: DebugProtocol.SetDataBreakpointsResponse, args: DebugProtocol.SetDataBreakpointsArguments) {
        await this.tryWithServices(response, async services => {
            const bps = await services.breakpointService.setDataBreakpoints(args.breakpoints);
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);
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
                    type: result.type,
                    memoryReference: result.memoryReference,
                    variablesReference: result.variablesReference,
                };
            });
        }
        this.sendResponse(response);
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
        console.log("Closing down debug adapter");
        if (this.services) {
            await this.services.contextService.dispose();
            this.services.runControlService.dispose();
            await CSpyCoresService.dispose();
            this.services.breakpointService.dispose();
            this.services.disassemblyService.dispose();
            this.services.memoryService.dispose();
            // Will disconnect this DAP debugger client
            this.services.cspyDebugger.close();
            // VSC-3 This will take care of orderly shutting down CSpyServer
            await this.services.serviceManager.dispose();
            this.services = undefined;
        }
        console.log("Adapter closed");
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
            if (typeof e === "string" || e instanceof Error) {
                response.message = e.toString();
                logger.error(e.toString());
            }
        }
    }
}
