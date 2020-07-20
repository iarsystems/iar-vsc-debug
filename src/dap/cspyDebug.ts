import { DebugProtocol } from "vscode-debugprotocol";
import { LoggingDebugSession,  StoppedEvent, OutputEvent, InitializedEvent, logger, Logger, Thread, DebugSession } from "vscode-debugadapter";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import * as Debugger from "./thrift/bindings/Debugger";
import * as Breakpoints from "./thrift/bindings/Breakpoints";
import * as ContextManager from "./thrift/bindings/ContextManager";
import * as DebugEventListener from "./thrift/bindings/DebugEventListener";
import { ThriftClient } from "./thrift/thriftclient";
import { DEBUGEVENT_SERVICE,  DEBUGGER_SERVICE, CONTEXT_MANAGER_SERVICE, DkNotifyConstant } from "./thrift/bindings/cspy_types";
import { DebugEventListenerHandler } from "./debugEventListenerHandler";
import { BREAKPOINTS_SERVICE } from "./thrift/bindings/breakpoints_types";
import { CSpyContextManager } from "./cspyContextManager";
import { Server } from "net";
import { CSpyBreakpointManager } from "./cspyBreakpointManager";
import { XclConfigurationResolver } from "./configresolution/xclConfigurationResolver";
const { Subject } = require('await-notify')


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
    /** enable logging the Debug Adapter Protocol */
    trace?: boolean;
    /** Path to the Embedded Workbench installation to use */
    workbenchPath: string;
    /** Path to the .ewp file of the project to debug */
    projectPath: string;
    /** Name of the project configuration to debug (e.g. Debug) */
    projectConfiguration: string;
}

/**
 * Manages a debugging session between VS Code and C-SPY (via CSpyServer2)
 * This is the class that implements the Debug Adapter Protocol (at least the
 * parts that aren't already implemented by the DAP SDK).
 */
export class CSpyDebugSession extends LoggingDebugSession {
    // we don't support multiple threads, so we can use a hardcoded ID for the default thread
    private static THREAD_ID = 1;

    private serviceManager: ThriftServiceManager;

    // cspy services
    private cspyDebugger: ThriftClient<Debugger.Client>;
    private cspyBreakpoints: ThriftClient<Breakpoints.Client>;
    private cspyContexts: ThriftClient<ContextManager.Client>;

    private cspyEventHandler: DebugEventListenerHandler;
    private cspyEventServer: Server; // keep a reference to this so we can close it at the end of the session

    private stackManager: CSpyContextManager;
    private breakpointManager: CSpyBreakpointManager;

    // Sequence number for custom events
    private eventSeq = 0;

    private configurationDone = new Subject();

    // Need to keep track of this for when we initialize the breakpoint manager
    private clientLinesStartAt1 = false;
    private clientColumnsStartAt1 = false;

    private expectedStoppingReason: "entry" | "breakpoint" | "step" | "pause" = "entry";

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
    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        // build and return the capabilities of this debug adapter:
        response.body = response.body || {};

        // the adapter implements the configurationDoneRequest.
        response.body.supportsConfigurationDoneRequest = true;

        // make VS Code use 'evaluate' when hovering over source
        response.body.supportsEvaluateForHovers = true;
        response.body.supportsRestartRequest = true;
        response.body.supportsSetVariable = true;
        // TODO: implement some extra capabilites, like disassemble and readmemory

        this.clientLinesStartAt1 = args.linesStartAt1 || false;
        this.clientColumnsStartAt1 = args.columnsStartAt1 || false;

        this.sendResponse(response);
    }

    protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments) {
        super.configurationDoneRequest(response, args);
        console.log("ConfigDone");
        this.configurationDone.notify();
    }

    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: CSpyLaunchRequestArguments) {
        // make sure to 'Stop' the buffered logging if 'trace' is not set
        logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

        // initialize all the services we need
        this.serviceManager = await ThriftServiceManager.fromWorkbench(args.workbenchPath);

        this.cspyEventHandler = new DebugEventListenerHandler();
        await this.serviceManager.startService(DEBUGEVENT_SERVICE, DebugEventListener, this.cspyEventHandler);
        this.cspyEventHandler.observeLogEvents(event => {
            if (!event.text.endsWith("\n")) { event.text += "\n"; }
            this.sendEvent(new OutputEvent(event.text));
        });

        this.cspyDebugger = await this.serviceManager.findService(DEBUGGER_SERVICE, Debugger);
        this.sendEvent(new OutputEvent("Using C-SPY version: " + await this.cspyDebugger.service.getVersionString() + "\n"));

        this.cspyBreakpoints = await this.serviceManager.findService(BREAKPOINTS_SERVICE, Breakpoints);
        this.breakpointManager = new CSpyBreakpointManager(this.cspyBreakpoints.service, this.clientLinesStartAt1, this.clientColumnsStartAt1);

        this.cspyContexts = await this.serviceManager.findService(CONTEXT_MANAGER_SERVICE, ContextManager);
        this.stackManager = new CSpyContextManager(this.cspyContexts.service, this.cspyDebugger.service);

        try {
            const sessionConfig = await new XclConfigurationResolver().resolveLaunchArguments(args);
            await this.cspyDebugger.service.startSession(sessionConfig);
            // TODO: consider reporting progress using a fake frontend
            await this.cspyDebugger.service.loadModule(args.program);
            this.sendEvent(new OutputEvent("Session started"));
        } catch (e) {
            response.success = false;
            response.message = e.toString();
            this.sendResponse(response);
            await this.endSession();
            return;
        }

        // we are ready to receive configuration requests (e.g. breakpoints)
        this.sendEvent(new InitializedEvent());
        // wait until configuration is done
        await this.configurationDone.wait(1000);

        this.sendResponse(response);

        // tell cspy to start the program
        await this.cspyDebugger.service.runToULE("main", false);

        this.addCSpyEventHandlers();

        if (args.stopOnEntry) {
            this.sendEvent(new StoppedEvent("entry", CSpyDebugSession.THREAD_ID));
        } else {
            await this.cspyDebugger.service.go();
        }
    }

    private addCSpyEventHandlers() {
        this.cspyEventHandler.observeDebugEvents(DkNotifyConstant.kDkTargetStopped, (event) => {
            // TODO: figure out if it's feasible to get a precise reason for stopping from C-SPY
            console.log("Target stopped, sending StoppedEvent");
            this.sendEvent(new StoppedEvent(this.expectedStoppingReason, CSpyDebugSession.THREAD_ID));
        });
    }

    protected async terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments) {
        await this.cspyDebugger.service.stopSession();
        await this.endSession();
        this.sendResponse(response);
    }

    protected async pauseRequest(response: DebugProtocol.PauseResponse) {
        this.expectedStoppingReason = "pause";
        this.cspyDebugger.service.stop();
        this.sendResponse(response);
    }
    protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
        this.expectedStoppingReason = "breakpoint";
        this.cspyDebugger.service.go();
        this.sendResponse(response);
    }

    protected async restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments) {
        this.expectedStoppingReason = "entry";
        await this.cspyDebugger.service.reset();
        this.cspyDebugger.service.runToULE("main", false);
        // TODO: should we call 'go' here? Maybe the launch argument 'stopOnEntry' should be stored, so we have it here
        this.sendResponse(response);
    }

    protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
        this.expectedStoppingReason = "step";
        if (args.granularity === "instruction") {
            this.cspyDebugger.service.instructionStepOver();
        } else {
            this.cspyDebugger.service.stepOver(true);
        }
        this.sendResponse(response);
    }

    protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
        this.expectedStoppingReason = "step";
        if (args.granularity === "instruction") {
            this.cspyDebugger.service.instructionStep();
        } else {
            this.cspyDebugger.service.step(true);
        }
        this.sendResponse(response);
    }

    protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
        this.expectedStoppingReason = "step";
        this.cspyDebugger.service.stepOut();
        this.sendResponse(response);
    }

    protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
        console.log("SetBPs");
        if (args.breakpoints) {
            try {
                const bps = await this.breakpointManager.setBreakpointsFor(args.source, args.breakpoints);
                console.log(bps);
                response.body = {
                    breakpoints: bps,
                };
            } catch (e) {
                console.error(e);
                response.success = false;
                response.message = e.toString();
            }
        }
        this.sendResponse(response);
        this.performDisassemblyEvent(); // update disassembly to reflect changed breakpoints
    }

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        // doesn't support multicore for now, so just return a default 'thread'
        response.body = {
            threads: [
                new Thread(CSpyDebugSession.THREAD_ID, "core 1")
            ]
        };
        this.sendResponse(response);
    }

    protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
        console.log("StackTrace");
        try {
            const frames = await this.stackManager.fetchStackFrames();
            response.body = {
                stackFrames: frames,
                totalFrames: frames.length,
            };
        } catch (e) {
            response.success = false;
            response.message = e.toString();
        }
        this.sendResponse(response);
        this.performDisassemblyEvent();
    }

    protected async scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
        console.log("Scopes");
        try {
            const scopes = await this.stackManager.fetchScopes(args.frameId);
            response.body = {
                scopes: scopes,
            };
        } catch (e) {
            response.success = false;
            response.message = e.toString();
        }
        this.sendResponse(response);
    }

    protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
        console.log("Variables");
        try {
            const variables = await this.stackManager.fetchVariables(args.variablesReference);
            response.body = {
                variables: variables,
            };
        } catch (e) {
            response.success = false;
            response.message = e.toString();
        }
        this.sendResponse(response);
    }

    protected async setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments) {
        try {
            const newVal = await this.stackManager.setVariable(args.variablesReference, args.name, args.value);
            response.body = {
                value: newVal,
            };
        } catch (e) {
            response.success = false;
            response.message = e.toString();
        }
        this.sendResponse(response);
    }


    protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments) {
        console.log("Eval");
        try {
            const val = await this.stackManager.evalExpression(args.frameId || 0, args.expression);
            // TODO: expandable variables using subexpressions
            response.body = {
                result: val.value,
                type: val.type,
                memoryReference: val.hasLocation ? val.location.address.toString() : undefined,
                variablesReference: 0,
            };
        } catch (e) {
            console.log(e);
            response.success = false;
            response.message = e.toString();
        }
        this.sendResponse(response);
    }

    private performDisassemblyEvent() {
        // TODO: implement
    }

    private async endSession() {
        console.log("Killing session");
        this.cspyContexts.close();
        this.cspyBreakpoints.close();
        this.cspyDebugger.close();
        await this.serviceManager.stop();
        this.cspyEventServer.close();
    }
}
DebugSession.run(CSpyDebugSession);