import * as Path from "path";
import { DebugProtocol } from "vscode-debugprotocol";
import { LoggingDebugSession, Handles, StoppedEvent, OutputEvent, TerminatedEvent, InitializedEvent, logger, Logger, Breakpoint, Thread, Source, StackFrame, Scope, DebugSession } from "vscode-debugadapter";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import * as Debugger from "./thrift/bindings/Debugger";
import * as Breakpoints from "./thrift/bindings/Breakpoints";
import * as ContextManager from "./thrift/bindings/ContextManager";
import { ThriftClient } from "./thrift/thriftclient";
import { SessionConfiguration, DEBUGEVENT_SERVICE, DebugSettings, DEBUGGER_SERVICE, CONTEXT_MANAGER_SERVICE, DkNotifyConstant } from "./thrift/bindings/cspy_types";
import { StackSettings, Symbol, ContextRef, ContextType, ExprFormat } from "./thrift/bindings/shared_types";
import { DebugEventListenerService, DebugEventListenerHandler } from "./debugEventListenerService";
import { ServiceLocation, Protocol, Transport } from "./thrift/bindings/ServiceRegistry_types";
import { BREAKPOINTS_SERVICE } from "./thrift/bindings/breakpoints_types";
import { CSpyStackManager } from "./cspyStackManager";
import { MockConfigurationResolver } from "./mockConfigurationResolver";
import { Server } from "net";
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
    /** Options to pass on to the debugger */
    options: string[];
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

    private stackManager: CSpyStackManager;


    // Used to assign a unique Id to each breakpoint
    private bpIndex = 0;

    // Sequence number for custom events
    private eventSeq = 0;

    private configurationDone = new Subject();

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

        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
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
        // TODO: how to decide on a port number? should be able to run multiple simultaneous sessions...
        [this.cspyEventServer, this.cspyEventHandler] = DebugEventListenerService.create(11112);
        await this.serviceManager.registerService(DEBUGEVENT_SERVICE, new ServiceLocation({ host: "localhost", port: 11112, protocol: Protocol.Binary, transport: Transport.Socket }));

        this.cspyDebugger = await this.serviceManager.findService(DEBUGGER_SERVICE, Debugger);
        this.cspyBreakpoints = await this.serviceManager.findService(BREAKPOINTS_SERVICE, Breakpoints);
        this.sendEvent(new OutputEvent("Using C-SPY version: " + await this.cspyDebugger.service.getVersionString() + "\n"));

        this.cspyContexts = await this.serviceManager.findService(CONTEXT_MANAGER_SERVICE, ContextManager);
        this.stackManager = new CSpyStackManager(this.cspyContexts.service);

        try {
            // These are the default settings in the eclipse plugin
            await this.cspyDebugger.service.setDebugSettings(new DebugSettings({
                alwaysPickAllInstances: false,
                enterFunctionsWithoutSource: true,
                stlDepth: 10,
                memoryWindowUpdateInterval: 1000,
                staticWatchUpdateInterval: 1000,
                globalIntegerFormat: 2,
            }));

            const sessionConfig = await new MockConfigurationResolver().resolveLaunchArguments(args);
            await this.cspyDebugger.service.startSession(sessionConfig);
            await this.cspyDebugger.service.loadModule(args.program);
            this.sendEvent(new OutputEvent(`Loaded module '${args.program}'\n`));
        } catch (e) {
            response.success = false;
            response.message = e.toString();
            this.sendResponse(response);
            await this.endSession();
            return;
        }

        // wait until configuration is done
        await this.configurationDone.wait(1000);
        this.sendResponse(response);

        // tell cspy to start the program
        console.log("Running to main...");
        await this.cspyDebugger.service.runToULE("main", false);

        this.addHandlers();

        if (!!args.stopOnEntry) {
            this.sendEvent(new StoppedEvent("entry", CSpyDebugSession.THREAD_ID));
        } else {
            await this.cspyDebugger.service.go();
        }
    }

    private addHandlers() {
        this.cspyEventHandler.observeDebugEvent(DkNotifyConstant.kDkTargetStopped, (event) => {
            // TODO: figure out if it's feasible to give a precise reason for stopping
            console.log("Target stopped, sending StoppedEvent");
            this.sendEvent(new StoppedEvent("breakpoint", CSpyDebugSession.THREAD_ID));
        });
    }

    protected async terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments) {
        await this.cspyDebugger.service.stopSession();
        await this.endSession();
        this.sendResponse(response);
    }

    protected async pauseRequest(response: DebugProtocol.PauseResponse) {
        await this.cspyDebugger.service.stop();
        this.sendResponse(response);
    }
    protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
        await this.cspyDebugger.service.go();
        this.sendResponse(response);
    }

    protected async restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments) {
        await this.cspyDebugger.service.reset();
        await this.cspyDebugger.service.runToULE("main", false);
        // TODO: should we call 'go' here? Maybe the launch argument 'stopOnEntry' should be stored, so we have it here
        this.sendResponse(response);
    }

    protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
        this.cspyDebugger.service.stepOver(true);
        this.sendResponse(response);
    }

    protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
        this.cspyDebugger.service.step(true);
        this.sendResponse(response);
    }

    protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
        this.cspyDebugger.service.stepOut();
        this.sendResponse(response);
    }

    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
        console.log("SetBPs");
        // TODO: implement
        // const clientLines = args.lines || [];

        // const localBreakpoints = clientLines.map(line => { // For sending to C-SPY
        //     return { line: this.convertClientLineToDebugger(line), id: this.bpIndex++ }
        // });
        // const cspyRequest = {
        //     breakpoints: localBreakpoints,
        //     file: basename(args.source.path!!)
        // };

        // const newLocal = this;
        // this.cSpyRClient.sendCommandWithCallback("setBreakpoints", cspyRequest, function (cspyResponse) {
        //     const actualBreakpoints = localBreakpoints.map(b => { // For sending to DAP client
        //         const verifiedBps: number[] = cspyResponse;
        //         return new Breakpoint(verifiedBps.includes(b.id),
        //             newLocal.convertDebuggerLineToClient(b.line));
        //     })

        //     response.body = {
        //         breakpoints: actualBreakpoints
        //     };
        //     newLocal.sendResponse(response);
        // });
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
            const newVal = await this.stackManager.setVariable(args.variablesReference);
            response.body = {
                value: newVal,
            };
        } catch (e) {
            response.success = false;
            response.message = e.toString();
        }
        this.sendResponse(response);
    }


    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
        console.log("Eval");
        // TODO: implement
    }

    protected customRequest(command: string, response: DebugProtocol.Response, _: any): void {
        switch (command) {
            case "istepOver":
                // TODO: implement
                break;
            case "istepInto":
                // TODO: implement
                break;
        }
    }

    // Generic callback for events like run/step etc., that should send back a StoppedEvent on return
    private stopEventCallback(stopReason: "entry" | "step" | "breakpoint" | "pause") {
        const newLocal = this;
        return async function (debugeeTerminated: boolean) {
            if (!debugeeTerminated) {
                // ideally, the stop reason should be determined from C-SPY, but this is good enough
                newLocal.sendEvent(new StoppedEvent(stopReason, CSpyDebugSession.THREAD_ID));
            } else {
                newLocal.sendEvent(new TerminatedEvent());
                await newLocal.endSession();
            }
        }
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