/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { DebugProtocol } from "@vscode/debugprotocol";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { LoggingDebugSession,  StoppedEvent, OutputEvent, InitializedEvent, logger, Logger, Thread, TerminatedEvent, InvalidatedEvent, Event, DebugSession } from "@vscode/debugadapter";
import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import * as DebugEventListener from "iar-vsc-common/thrift/bindings/DebugEventListener";
import * as LibSupportService2 from "iar-vsc-common/thrift/bindings/LibSupportService2";
import * as Frontend from "iar-vsc-common/thrift/bindings/Frontend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { DEBUGEVENT_SERVICE,  DEBUGGER_SERVICE, SessionConfiguration } from "iar-vsc-common/thrift/bindings/cspy_types";
import { DebugEventListenerHandler } from "./debugEventListenerHandler";
import { CSpyContextManager } from "./contexts/cspyContextManager";
import { BreakpointType, CSpyBreakpointManager } from "./breakpoints/cspyBreakpointManager";
import { LaunchArgumentConfigurationResolver}  from "./configresolution/launchArgumentConfigurationResolver";
import { CSpyException } from "iar-vsc-common/thrift/bindings/shared_types";
import { LIBSUPPORT_SERVICE } from "iar-vsc-common/thrift/bindings/libsupport_types";
import { LibSupportHandler } from "./libSupportHandler";
// There are no types for this library. We should probably look to replace it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Subject } from "await-notify";
import { CSpyDriver } from "./breakpoints/cspyDriver";
import { Command, CommandRegistry } from "./commandRegistry";
import { Utils } from "./utils";
import { CspyDisassemblyManager } from "./cspyDisassemblyManager";
import { CspyMemoryManager } from "./cspyMemoryManager";
import { BreakpointTypesResponse, CustomRequest } from "./customRequest";
import { RegisterInformationGenerator } from "./registerInformationGenerator";
import { FrontendHandler } from "./frontendHandler";
import { FRONTEND_SERVICE } from "iar-vsc-common/thrift/bindings/frontend_types";
import { Workbench, WorkbenchType } from "iar-vsc-common/workbench";
import { CSpyCoresService } from "./contexts/cspyCoresService";
import { CSpyRunControlService } from "./contexts/cspyRunControlService";

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
    /** Automatically stop target after launch. If not specified, target does not stop. */
    stopOnEntry?: boolean;
    /** The type of breakpoint to use by default. This isn't normally provided directly in the launch.json (it's not declared in package.json).
    * Instead it is provided from the user's selection in the UI. */
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
    /** Hidden option. Allows starting sessions with any target (although it might not work) */
    bypassTargetRestriction?: boolean;
}

/**
 * Manages a debugging session between VS Code and C-SPY (via CSpyServer2)
 * This is the class that implements the Debug Adapter Protocol (at least the
 * parts that aren't already implemented by the DAP SDK).
 */
export class CSpyDebugSession extends LoggingDebugSession {

    private serviceManager: ThriftServiceManager | undefined = undefined;

    private cspyDebugger: ThriftClient<Debugger.Client> | undefined = undefined;

    private readonly cspyEventHandler = new DebugEventListenerHandler();
    private readonly libSupportHandler = new LibSupportHandler();

    private registerInfoGenerator: RegisterInformationGenerator | undefined = undefined;
    private stackManager: CSpyContextManager | undefined = undefined;
    private runControlService: CSpyRunControlService | undefined = undefined;
    private breakpointManager: CSpyBreakpointManager | undefined = undefined;
    private disassemblyManager: CspyDisassemblyManager | undefined = undefined;
    private memoryManager: CspyMemoryManager | undefined = undefined;

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

    // TODO: report progress using a frontend service and the Progress(Start|Update|End) DAP events
    protected override async launchRequest(response: DebugProtocol.LaunchResponse, args: CSpyLaunchRequestArguments) {
        logger.init(e => this.sendEvent(e), undefined, true);
        logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop);

        try {
            // validate the workbench before trying to use it
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
            // initialize all the services we need
            this.serviceManager = await ThriftServiceManager.fromWorkbench(workbench.path, this.numCores);

            await this.serviceManager.startService(DEBUGEVENT_SERVICE, DebugEventListener, this.cspyEventHandler);
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
            });
            this.libSupportHandler.observeInputRequest(() => {
                this.sendEvent(new OutputEvent("Debugee requested terminal input:"));
            });
            this.serviceManager.startService(LIBSUPPORT_SERVICE, LibSupportService2, this.libSupportHandler);

            const frontendHandler = new FrontendHandler();
            this.serviceManager.startService(FRONTEND_SERVICE, Frontend, frontendHandler);

            const sessionConfig: SessionConfiguration = await new LaunchArgumentConfigurationResolver().resolveLaunchArguments(args);

            this.cspyDebugger = await this.serviceManager.findService(DEBUGGER_SERVICE, Debugger);
            this.sendEvent(new OutputEvent("Using C-SPY version: " + await this.cspyDebugger.service.getVersionString() + "\n"));

            await this.cspyDebugger.service.startSession(sessionConfig);
            const driver = CSpyDriver.driverFromName(args.driver);

            // do flashing & downloading
            if (args.download) {
                await Utils.loadMacros(this.cspyDebugger.service, args.download.deviceMacros ?? []);
                if (args.download.flashLoader) {
                    await this.cspyDebugger.service.flashModule(args.download.flashLoader, sessionConfig.executable, [], []);
                }
            }
            await Utils.loadMacros(this.cspyDebugger.service, sessionConfig.setupMacros ?? []);
            await this.cspyDebugger.service.loadModule(args.program);
            this.sendEvent(new OutputEvent("Session started\n"));

            this.registerInfoGenerator = new RegisterInformationGenerator(args.driverOptions, await this.serviceManager.findService(DEBUGGER_SERVICE, Debugger));
            // only after loading modules can we initialize services using listwindows
            CSpyCoresService.initialize(this.serviceManager);
            this.stackManager = await CSpyContextManager.instantiate(this.serviceManager, this.registerInfoGenerator);
            this.runControlService = await CSpyRunControlService.instantiate(this.serviceManager, this.cspyEventHandler, this.libSupportHandler);
            this.memoryManager = await CspyMemoryManager.instantiate(this.serviceManager);
            this.disassemblyManager = await CspyDisassemblyManager.instantiate(this.serviceManager,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1);
            // initialize all breakpoint stuff
            this.breakpointManager = await CSpyBreakpointManager.instantiate(this.serviceManager,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1,
                driver);
            // VSC-295 Remove any cross-session breakpoints loaded from the .dnx file
            await this.breakpointManager.clearAllBreakpoints();
            this.setupBreakpointRequests(args.breakpointType ?? BreakpointType.AUTO);
            this.setupRegistersRequest();

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

        // we are ready to receive configuration requests (e.g. breakpoints)
        this.sendEvent(new InitializedEvent());
        // wait until configuration is done
        await this.configurationDone.wait(1000);

        this.sendResponse(response);

        this.addCSpyEventHandlers();

        // TODO: should this affect all cores or just the first one?
        if (args.stopOnEntry) {
            await this.runControlService.runToULE(0, "main");
        } else {
            await this.runControlService.continue(0, true);
        }
    }

    // TODO refactor/remove me
    private addCSpyEventHandlers() {
        this.runControlService?.onCoreStopped((core, reason) => {
            this.sendEvent(new StoppedEvent(reason, core));
        });
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
        await CSpyDebugSession.tryResponseWith(this.runControlService, response, async(runControl) => {
            await runControl.pause(args.threadId);
        });
        this.sendResponse(response);
    }
    protected override async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
        await CSpyDebugSession.tryResponseWith(this.runControlService, response, async(runControl) => {
            await runControl.continue(args.threadId, args.singleThread ?? false);
        });
        this.sendResponse(response);
    }

    protected override async restartRequest(response: DebugProtocol.RestartResponse, _args: DebugProtocol.RestartArguments) {
        await CSpyDebugSession.tryResponseWith(this.runControlService, response, async runControl => {
            await runControl.reset();
        });
        this.sendResponse(response);
    }

    protected override async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
        await CSpyDebugSession.tryResponseWith(this.runControlService, response, async(runControl) => {
            await runControl.next(args.threadId, args.granularity);
            // TODO: what about args.singleThread?
        });
        this.sendResponse(response);
    }

    protected override async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
        await CSpyDebugSession.tryResponseWith(this.runControlService, response, async(runControl) => {
            await runControl.stepIn(args.threadId, args.granularity);
        });
        this.sendResponse(response);
    }

    protected override async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
        await CSpyDebugSession.tryResponseWith(this.runControlService, response, runControl => {
            return runControl.stepOut(args.threadId);
        });
        this.sendResponse(response);
    }

    protected override async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
        await CSpyDebugSession.tryResponseWith(this.breakpointManager, response, async breakpointManager => {
            const bps = await breakpointManager.setBreakpointsFor(args.source, args.breakpoints ?? []);
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);
    }
    protected override async setInstructionBreakpointsRequest(response: DebugProtocol.SetInstructionBreakpointsResponse, args: DebugProtocol.SetInstructionBreakpointsArguments) {
        await CSpyDebugSession.tryResponseWith(this.breakpointManager, response, async breakpointManager => {
            const bps = await breakpointManager.setInstructionBreakpointsFor(args.breakpoints);
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);
    }

    protected override async threadsRequest(response: DebugProtocol.ThreadsResponse) {
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, async dbgr => {
            const nCores = await dbgr.service.getNumberOfCores();
            const threads: Thread[] = [];
            for (let i = 0; i < nCores; i++) {
                const description = await dbgr.service.getCoreDescription(i);
                threads.push(new Thread(i, `${i}: ${description}`));
            }
            response.body = {
                threads,
            };
        });
        this.sendResponse(response);
    }

    protected override async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
            const frames = await stackManager.fetchStackFrames(args.threadId);
            response.body = {
                stackFrames: frames,
                totalFrames: frames.length,
            };
        });
        this.sendResponse(response);
    }

    protected override async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, stackManager => {
            const scopes = stackManager.fetchScopes(args.frameId);
            response.body = {
                scopes: scopes,
            };
        });
        this.sendResponse(response);
    }

    protected override async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
            const variables = await stackManager.fetchVariables(args.variablesReference);
            response.body = {
                variables: variables,
            };
        });
        this.sendResponse(response);
    }

    protected override async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments) {
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
            const { newValue, changedAddress } = await stackManager.setVariable(args.variablesReference, args.name, args.value);
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
            await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
                const result = await stackManager.evalExpression(args.frameId, args.expression);
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
        await CSpyDebugSession.tryResponseWith(this.disassemblyManager, response, async disassemblyManager => {
            const instructions = await disassemblyManager.fetchDisassembly(args.memoryReference, args.instructionCount, args.offset, args.instructionOffset);
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
        await CSpyDebugSession.tryResponseWith(this.memoryManager, response, async memoryManager => {
            const result = await memoryManager.readMemory(args.memoryReference.replace("'", ""), args.offset ?? 0, args.count);
            response.body = {
                address: "0x" + result.addr.toOctetString(),
                data: result.data,
                unreadableBytes: args.count - result.count,
            };
        });
        this.sendResponse(response);
    }
    protected override async writeMemoryRequest(response: DebugProtocol.WriteMemoryResponse, args: DebugProtocol.WriteMemoryArguments) {
        await CSpyDebugSession.tryResponseWith(this.memoryManager, response, async memoryManager => {
            const bytesWritten = await memoryManager.writeMemory(args.memoryReference.replace("'", ""), args.offset ?? 0, args.data);
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


    /**
     * Registers commands for setting breakpoints type via console commands and custom dap requests.
     */
    private setupBreakpointRequests(requestedInitialType: BreakpointType) {
        const bpTypeMessage = (type: BreakpointType) => `Now using ${type} breakpoints (only applies to new breakpoints)`;
        if (this.breakpointManager?.supportedBreakpointTypes().includes(requestedInitialType)) {
            this.breakpointManager?.setBreakpointType(requestedInitialType);
            this.sendEvent(new OutputEvent(`Using '${requestedInitialType}' breakpoint type.\n`));
        }
        // If the driver supports it, register console commands and custom requests
        this.breakpointManager?.supportedBreakpointTypes().forEach(type => {
            this.consoleCommandRegistry.registerCommand(new Command("__breakpoints_set_type_" + type, () => {
                this.breakpointManager?.setBreakpointType(type);
                return Promise.resolve(bpTypeMessage(type));
            }));
        });
        // Custom requests are always registered, but will give an error if made on a driver that doesn't support it.
        const makeCustomRequestCommand = (name: string, type: BreakpointType) => {
            return new Command(name, () => {
                if (this.breakpointManager?.supportedBreakpointTypes().includes(type)) {
                    this.breakpointManager?.setBreakpointType(type);
                    this.sendEvent(new OutputEvent(bpTypeMessage(type) + "\n"));
                    return Promise.resolve();
                } else {
                    this.sendEvent(new OutputEvent("Cannot set breakpoint type (not supported by driver)"));
                    return Promise.reject(new Error());
                }
            });
        };
        this.customRequestRegistry.registerCommand(makeCustomRequestCommand(CustomRequest.USE_AUTO_BREAKPOINTS, BreakpointType.AUTO));
        this.customRequestRegistry.registerCommand(makeCustomRequestCommand(CustomRequest.USE_HARDWARE_BREAKPOINTS, BreakpointType.HARDWARE));
        this.customRequestRegistry.registerCommand(makeCustomRequestCommand(CustomRequest.USE_SOFTWARE_BREAKPOINTS, BreakpointType.SOFTWARE));

        this.customRequestRegistry.registerCommand(new Command(CustomRequest.GET_BREAKPOINT_TYPES, (): Promise<BreakpointTypesResponse> => {
            return Promise.resolve(this.breakpointManager?.supportedBreakpointTypes() ?? []);
        }));
    }

    /**
     * Sets up a custom request that returns the peripheral registers for the current device as an SVD string.
     */
    private setupRegistersRequest() {
        this.customRequestRegistry.registerCommand(new Command(CustomRequest.REGISTERS, async() => {
            if (this.registerInfoGenerator) {
                return { svdContent: await this.registerInfoGenerator.getSvdXml() };
            }
            return { svdContent: undefined };
        }));
    }

    private async endSession() {
        await this.stackManager?.dispose();
        this.runControlService?.dispose();
        CSpyCoresService.dispose();
        this.breakpointManager?.dispose();
        this.disassemblyManager?.dispose();
        this.memoryManager?.dispose();
        // Will disconnect this DAP debugger client
        this.cspyDebugger?.close();
        // VSC-3 This will take care of orderly shutting down CSpyServer
        await this.serviceManager?.dispose();
    }

    /**
     * Performs some standard error handling around a DAP request reponse, which requires some potentially undefined object.
     * If the object is undefined, or the handling of the request throws an error, the request is marked as unsucessful and
     * an appropriate error msg is set.
     * @param obj The object required to be defined
     * @param response The response to send to the DAP request
     * @param fun The function to run with the object, if defined
     */
    private static async tryResponseWith<T, R extends DebugProtocol.Response>(obj: T | undefined, response: R, fun: (obj: T) => void | Promise<void>) {
        try {
            if (obj === undefined) {
                throw new Error("Unexpected undefined object");
            }
            await fun(obj);
        } catch (e) {
            response.success = false;
            if (typeof e === "string" || e instanceof Error) {
                response.message = e.toString();
                logger.error(e.toString());
            }
        }
    }
}

DebugSession.run(CSpyDebugSession);
