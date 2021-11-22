import { DebugProtocol } from "vscode-debugprotocol";
import { LoggingDebugSession,  StoppedEvent, OutputEvent, InitializedEvent, logger, Logger, Thread, DebugSession, TerminatedEvent } from "vscode-debugadapter";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import * as Debugger from "./thrift/bindings/Debugger";
import * as DebugEventListener from "./thrift/bindings/DebugEventListener";
import * as LibSupportService2 from "./thrift/bindings/LibSupportService2";
import { ThriftClient } from "./thrift/thriftClient";
import { DEBUGEVENT_SERVICE,  DEBUGGER_SERVICE, DkNotifyConstant, SessionConfiguration } from "./thrift/bindings/cspy_types";
import { DebugEventListenerHandler } from "./debugEventListenerHandler";
import { CSpyContextManager } from "./cspyContextManager";
import { BreakpointType, CSpyBreakpointManager } from "./breakpoints/cspyBreakpointManager";
import { XclConfigurationResolver } from "./configresolution/xclConfigurationResolver";
import { LaunchArgumentConfigurationResolver}  from "./configresolution/launchArgumentConfigurationResolver";
import { CSpyException } from "./thrift/bindings/shared_types";
import { LIBSUPPORT_SERVICE } from "./thrift/bindings/libsupport_types";
import { LibSupportHandler } from "./libSupportHandler";
// There are no types for this library. We should probably look to replace it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Subject } from "await-notify";
import { CSpyDriver } from "./breakpoints/cspyDriver";
import { Command, CommandRegistry } from "./commandRegistry";
import { Utils } from "./utils";


/**
 * This interface describes the cspy-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol), which the DAP client
 * should provide at launch (e.g. via a `launch.json` file).
 * The schema for these attributes lives in the package.json of this extension,
 * and this interface should always match that schema.
 */
export interface CSpyLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    /** An absolute path to the "program" to debug. */
    program: string;
    /** Automatically stop target after launch. If not specified, target does not stop. */
    stopOnEntry?: boolean;
    /** The type of breakpoint to use by default (only applicable to some drivers). */
    breakpointType?: "auto" | "hardware" | "software" | string;
    /** enable logging the Debug Adapter Protocol */
    trace?: boolean;
    /** Path to the Embedded Workbench installation to use */
    workbenchPath: string;
    /** Path to the .ewp file of the project to debug */
    projectPath: string;
    /** Name of the project configuration to debug (e.g. Debug) */
    projectConfiguration: string;
    /** The name of the driver library to use.*/
    driverLib?: string;
    /** The driver options as a list of string*/
    driverOptions?: string[];
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
}

/**
 * Manages a debugging session between VS Code and C-SPY (via CSpyServer2)
 * This is the class that implements the Debug Adapter Protocol (at least the
 * parts that aren't already implemented by the DAP SDK).
 */
export class CSpyDebugSession extends LoggingDebugSession {
    // we don't support multiple threads, so we can use a hardcoded ID for the default thread
    private static readonly THREAD_ID = 1;

    private serviceManager: ThriftServiceManager | undefined = undefined;

    private cspyDebugger: ThriftClient<Debugger.Client> | undefined = undefined;

    private cspyEventHandler: DebugEventListenerHandler | undefined = undefined;

    private stackManager: CSpyContextManager | undefined = undefined;
    private breakpointManager: CSpyBreakpointManager | undefined = undefined;

    private readonly consoleCommandRegistry: CommandRegistry = new CommandRegistry();

    // Sequence number for custom events
    private eventSeq = 0;

    private readonly configurationDone = new Subject();

    // Need to keep track of this for when we initialize the breakpoint manager
    private clientLinesStartAt1 = false;
    private clientColumnsStartAt1 = false;

    private expectedStoppingReason: "entry" | "exit" | "breakpoint" | "step" | "pause" = "entry";

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

        this.clientLinesStartAt1 = args.linesStartAt1 || false;
        this.clientColumnsStartAt1 = args.columnsStartAt1 || false;

        this.sendResponse(response);
    }

    protected override configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments) {
        super.configurationDoneRequest(response, args);
        console.log("ConfigDone");
        this.configurationDone.notify();
    }

    // TODO: report progress using a frontend service and the Progress(Start|Update|End) DAP events
    protected override async launchRequest(response: DebugProtocol.LaunchResponse, args: CSpyLaunchRequestArguments) {
        // make sure to 'Stop' the buffered logging if 'trace' is not set
        logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

        // initialize all the services we need
        this.serviceManager = await ThriftServiceManager.fromWorkbench(args.workbenchPath);

        this.cspyEventHandler = new DebugEventListenerHandler();
        await this.serviceManager.startService(DEBUGEVENT_SERVICE, DebugEventListener, this.cspyEventHandler);
        this.cspyEventHandler.observeLogEvents(event => {
            if (!event.text.endsWith("\n")) {
                event.text += "\n";
            }
            this.sendEvent(new OutputEvent(event.text));
        });

        const libSupportHandler = new LibSupportHandler();
        libSupportHandler.observeOutput(data => {
            this.sendEvent(new OutputEvent(data, "stdout"));
        });
        libSupportHandler.observeExit(code => {
            this.sendEvent(new OutputEvent("Target program terminated, exit code " + code));
        });
        this.serviceManager.startService(LIBSUPPORT_SERVICE, LibSupportService2, libSupportHandler);

        try {
            let sessionConfig: SessionConfiguration;
            if (args.driverLib && args.driverOptions) {
                // The user has specified argument to use for the launch process.
                sessionConfig = await new LaunchArgumentConfigurationResolver().resolveLaunchArguments(args);
            } else {
                sessionConfig = await new XclConfigurationResolver().resolveLaunchArguments(args);
            }

            this.cspyDebugger = await this.serviceManager.findService(DEBUGGER_SERVICE, Debugger);
            this.sendEvent(new OutputEvent("Using C-SPY version: " + await this.cspyDebugger.service.getVersionString() + "\n"));

            await this.cspyDebugger.service.startSession(sessionConfig);
            const driver = CSpyDriver.fromDriverName(args.driverLib ?? sessionConfig.driverName); // TODO: figure out how to best do this

            // do flashing & downloading
            if (!driver.isSimulator() && args.download) {
                await Utils.loadMacros(this.cspyDebugger.service, args.download.deviceMacros ?? []);
                if (args.download.flashLoader) {
                    await this.cspyDebugger.service.flashModule(args.download.flashLoader, sessionConfig.executable, [], []);
                }
            }
            await Utils.loadMacros(this.cspyDebugger.service, sessionConfig.setupMacros ?? []);
            await this.cspyDebugger.service.loadModule(args.program);
            this.sendEvent(new OutputEvent("Session started\n"));

            // only after loading modules can we initialize services using listwindows
            this.stackManager = await CSpyContextManager.instantiate(this.serviceManager);
            // initialize all breakpoint stuff
            this.breakpointManager = await CSpyBreakpointManager.instantiate(this.serviceManager,
                this.clientLinesStartAt1,
                this.clientColumnsStartAt1,
                driver);

            if (this.breakpointManager.supportsBreakpointTypes()) {
                const type = args.breakpointType === "hardware" ? BreakpointType.HARDWARE :
                    args.breakpointType === "software" ? BreakpointType.SOFTWARE : BreakpointType.AUTO;
                this.breakpointManager.setBreakpointType(type);
                this.sendEvent(new OutputEvent(`Using '${type}' breakpoint type. To select hardware- or software breakpoints, type '__breakpoints_type_toggle' into the console\n`));

                this.consoleCommandRegistry.registerCommand(new Command("__breakpoints_set_type_software", () => {
                    this.breakpointManager?.setBreakpointType(BreakpointType.SOFTWARE);
                    return Promise.resolve(`Now using ${BreakpointType.SOFTWARE} breakpoints (only applies to new breakpoints)`);
                }));
                this.consoleCommandRegistry.registerCommand(new Command("__breakpoints_set_type_hardware", () => {
                    this.breakpointManager?.setBreakpointType(BreakpointType.HARDWARE);
                    return Promise.resolve(`Now using ${BreakpointType.HARDWARE} breakpoints (only applies to new breakpoints)`);
                }));
                this.consoleCommandRegistry.registerCommand(new Command("__breakpoints_type_toggle", () => {
                    const type = this.breakpointManager?.getBreakpointType() === BreakpointType.HARDWARE ? BreakpointType.SOFTWARE : BreakpointType.HARDWARE;
                    this.breakpointManager?.setBreakpointType(type);
                    return Promise.resolve(`Now using ${type} breakpoints (only applies to new breakpoints)`);
                }));
            }
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

        if (args.stopOnEntry) {
            this.expectedStoppingReason = "entry";
            // tell cspy to start the program
            await this.cspyDebugger.service.runToULE("main", false);
        } else {
            this.expectedStoppingReason = "breakpoint";
            await this.cspyDebugger.service.go();
        }
    }

    private addCSpyEventHandlers() {
        if (this.cspyEventHandler === undefined) {
            throw new Error("Expected CSPY event handler to be initialized, but it is not");
        }
        this.cspyEventHandler.observeDebugEvents(DkNotifyConstant.kDkTargetStopped, () => {
            // TODO: figure out if it's feasible to get a precise reason for stopping from C-SPY
            console.log("Target stopped, sending StoppedEvent");
            this.sendEvent(new StoppedEvent(this.expectedStoppingReason, CSpyDebugSession.THREAD_ID));
        });
    }

    protected override async terminateRequest(response: DebugProtocol.TerminateResponse, _args: DebugProtocol.TerminateArguments) {
        this.sendResponse(response);
        try {
            this.sendEvent(new OutputEvent("Shutting down C-SPY...\n"));
            await this.endSession();
        } catch (e) {
            console.log(e);
        }
        this.sendEvent(new TerminatedEvent());
    }
    protected override async disconnectRequest(response: DebugProtocol.DisconnectResponse, _args: DebugProtocol.DisconnectArguments) {
        await this.endSession();
        this.sendResponse(response);
    }

    protected override async pauseRequest(response: DebugProtocol.PauseResponse) {
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, cspyDebugger => {
            this.expectedStoppingReason = "pause";
            cspyDebugger.service.stop();
        });
        this.sendResponse(response);
    }
    protected override async continueRequest(response: DebugProtocol.ContinueResponse, _args: DebugProtocol.ContinueArguments) {
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, cspyDebugger => {
            this.expectedStoppingReason = "breakpoint";
            cspyDebugger.service.go();
        });
        this.sendResponse(response);
    }

    protected override async restartRequest(response: DebugProtocol.RestartResponse, _args: DebugProtocol.RestartArguments) {
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, async cspyDebugger => {
            this.expectedStoppingReason = "entry";
            await cspyDebugger.service.reset();
            cspyDebugger.service.runToULE("main", false);
            // TODO: should we call 'go' here? Maybe the launch argument 'stopOnEntry' should be stored, so we have it here
        });
        this.sendResponse(response);
    }

    protected override async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, cspyDebugger => {
            this.expectedStoppingReason = "step";
            if (args.granularity === "instruction") {
                cspyDebugger.service.instructionStepOver();
            } else {
                cspyDebugger.service.stepOver(true);
            }
        });
        this.sendResponse(response);
    }

    protected override async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, cspyDebugger => {
            this.expectedStoppingReason = "step";
            if (args.granularity === "instruction") {
                cspyDebugger.service.instructionStep();
            } else {
                cspyDebugger.service.step(true);
            }
        });
        this.sendResponse(response);
    }

    protected override async stepOutRequest(response: DebugProtocol.StepOutResponse, _args: DebugProtocol.StepOutArguments) {
        this.expectedStoppingReason = "step";
        await CSpyDebugSession.tryResponseWith(this.cspyDebugger, response, cspyDebugger => {
            cspyDebugger.service.stepOut();
        });
        this.sendResponse(response);
    }

    protected override async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
        console.log("SetBPs");
        await CSpyDebugSession.tryResponseWith(this.breakpointManager, response, async breakpointManager => {
            const bps = await breakpointManager.setBreakpointsFor(args.source, args.breakpoints ?? []);
            response.body = {
                breakpoints: bps,
            };
        });
        this.sendResponse(response);
        if (response.success) {
            this.performDisassemblyEvent(); // update disassembly to reflect changed breakpoints
        }
    }

    protected override threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        // doesn't support RTOS or multicore for now, so just return a default 'thread'
        response.body = {
            threads: [
                new Thread(CSpyDebugSession.THREAD_ID, "core 1")
            ]
        };
        this.sendResponse(response);
    }

    protected override async stackTraceRequest(response: DebugProtocol.StackTraceResponse, _args: DebugProtocol.StackTraceArguments) {
        console.log("StackTrace");
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
            const frames = await stackManager.fetchStackFrames();
            response.body = {
                stackFrames: frames,
                totalFrames: frames.length,
            };
        });
        this.sendResponse(response);
        this.performDisassemblyEvent();
    }

    protected override async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
        console.log("Scopes");
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, stackManager => {
            const scopes = stackManager.fetchScopes(args.frameId);
            response.body = {
                scopes: scopes,
            };
        });
        this.sendResponse(response);
    }

    protected override async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
        console.log("Variables");
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
            const variables = await stackManager.fetchVariables(args.variablesReference);
            response.body = {
                variables: variables,
            };
        });
        this.sendResponse(response);

        // Variable requests are also performed when the target is idle
        this.performDisassemblyEvent();
    }

    protected override async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments) {
        await CSpyDebugSession.tryResponseWith(this.stackManager, response, async stackManager => {
            const newVal = await stackManager.setVariable(args.variablesReference, args.name, args.value);
            response.body = {
                value: newVal,
            };
        });
        this.sendResponse(response);
    }


    protected override async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments) {
        console.log("Eval");
        if (this.consoleCommandRegistry.hasCommand(args.expression)) {
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
                const val = await stackManager.evalExpression(args.frameId || 0, args.expression);
                // TODO: expandable variables using subexpressions
                response.body = {
                    result: val.value,
                    type: val.type,
                    memoryReference: val.hasLocation ? val.location.address.toString() : undefined,
                    variablesReference: 0,
                };
            });
        }
        this.sendResponse(response);
    }

    // Currently not supported by VSCode
    protected override disassembleRequest(_response: DebugProtocol.DisassembleResponse, args: DebugProtocol.DisassembleArguments, _request?: DebugProtocol.Request) {
        console.log("DAP Disassemble", args);
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

    /**
     * As <tt>disassembleRequest</tt> is not supported by VSCode, we use our own callback.
     * <p>This is called along with e.g. variable requests and sends a custom DAP event
     * which is picked up by the extension to update our custom Disassembly view.
     */
    private performDisassemblyEvent() {
        // This relies on some other call to have set a suitable "inspection context" in C-SPY
        if (this.stackManager === undefined) {
            throw new Error("StackManager has not been initialized");
        }
        this.stackManager.fetchDisassembly().then((disasmBlock)=>{
            this.sendEvent({
                event: "disassembly",
                body: disasmBlock,
                seq: this.eventSeq++,
                type: "event",
            });
        });
    }

    private async endSession() {
        await this.stackManager?.dispose();
        this.breakpointManager?.dispose();
        // Will disconnect this DAP debugger client
        this.cspyDebugger?.dispose();
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
            }
        }
    }
}
DebugSession.run(CSpyDebugSession);