import * as Path from "path";
import { DebugProtocol } from "vscode-debugprotocol";
import { LoggingDebugSession, Handles, StoppedEvent, OutputEvent, TerminatedEvent, InitializedEvent, logger, Logger, Breakpoint, Thread, Source, StackFrame, Scope, DebugSession } from "vscode-debugadapter";
import { CSpyRubyClient } from "./cspyRubyClient";
import { basename } from "path";
import { ThriftServiceManager } from "./thrift/thriftservicemanager";
import * as Debugger from "./thrift/bindings/Debugger";
import * as Breakpoints from "./thrift/bindings/Breakpoints";
import * as ContextManager from "./thrift/bindings/ContextManager";
import { ThriftClient } from "./thrift/thriftclient";
import { SessionConfiguration, DEBUGEVENT_SERVICE, DebugSettings, DEBUGGER_SERVICE, CONTEXT_MANAGER_SERVICE } from "./thrift/bindings/cspy_types";
import { StackSettings, Symbol, ContextRef, ContextType, ExprFormat } from "./thrift/bindings/shared_types";
import { DebugEventListenerService } from "./debugEventListenerService";
import { ServiceLocation, Protocol, Transport } from "./thrift/bindings/ServiceRegistry_types";
import { BREAKPOINTS_SERVICE } from "./thrift/bindings/breakpoints_types";
const { Subject } = require('await-notify')

/**
 * This interface describes the cspy-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the this extension.
 * The interface should always match this schema.
 */
interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
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
 * Desribes a scope, i.e. a name/type (local, static or register) and a frame reference (the 'frame level')
 */
class ScopeReference {
    constructor(
        readonly name: "local" | "static" | "registers",
        readonly frameReference: number,
    ) { }
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

    // our communication channel with the cspyruby instance TODO: remove
    private cSpyRClient: CSpyRubyClient;

    private variableHandles = new Handles<ScopeReference>();

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

        this.cSpyRClient = new CSpyRubyClient();
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

    protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {
        // make sure to 'Stop' the buffered logging if 'trace' is not set
        logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

        this.serviceManager = await ThriftServiceManager.fromWorkbench(args.workbenchPath);
        DebugEventListenerService.create(11112); // TODO: how to decide on a port number? should be able to run multiple simultaneous sessions...
        await this.serviceManager.registerService(DEBUGEVENT_SERVICE, new ServiceLocation({ host: "localhost", port: 11112, protocol: Protocol.Binary, transport: Transport.Socket }));

        this.cspyDebugger = await this.serviceManager.findService(DEBUGGER_SERVICE, Debugger);
        this.cspyBreakpoints = await this.serviceManager.findService(BREAKPOINTS_SERVICE, Breakpoints);
        this.cspyContexts = await this.serviceManager.findService(CONTEXT_MANAGER_SERVICE, ContextManager);
        this.sendEvent(new OutputEvent("Using C-SPY version: " + await this.cspyDebugger.service.getVersionString() + "\n"));

        // TODO: find some way to generate this
        const config: SessionConfiguration = new SessionConfiguration({
            attachToTarget: false,
            driverName: "armsim2",
            processorName: "armproc",
            type: "simulator",
            executable: args.program,
            configName: "Debug",
            leaveRunning: true,
            enableCRun: false,
            options: args.options,
            plugins: ["armbat"],
            projectDir: Path.resolve(Path.join(Path.parse(args.program).dir, "../../")),
            projectName: "ewproj.ewp",
            setupMacros: [],
            target: "arm",
            toolkitDir: Path.join(args.workbenchPath, "arm"),
            stackSettings: new StackSettings({
                fillEnabled: false,
                displayLimit: 50,
                limitDisplay: false,
                overflowWarningsEnabled: true,
                spWarningsEnabled: true,
                triggerName: "main",
                useTrigger: true,
                warnLogOnly: true,
                warningThreshold: 90,
            }),
        });
        try {
            await this.cspyDebugger.service.setDebugSettings(new DebugSettings({
                alwaysPickAllInstances: false,
                enterFunctionsWithoutSource: true,
                stlDepth: 10,
                memoryWindowUpdateInterval: 1000,
                staticWatchUpdateInterval: 1000,
                globalIntegerFormat: 2,
            }));
            await this.cspyDebugger.service.startSession(config);
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


        if (!!args.stopOnEntry) {
            this.sendEvent(new StoppedEvent("entry", CSpyDebugSession.THREAD_ID));
        } else {
            await this.cspyDebugger.service.go();
        }
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
    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
        this.sendResponse(response);
    }

    protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments): void {
        this.sendResponse(response);
    }

    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
        this.sendResponse(response);
    }

    protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
        this.sendResponse(response);
    }

    protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
        this.sendResponse(response);
    }

    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
        console.log("SetBPs");
        // if (args.breakpoints) {
        // 	response.body = {
        // 		breakpoints: [{ verified: false, id: 0 }],
        // 	};
        // }
        // this.sendResponse(response);
        // return;
        const clientLines = args.lines || [];

        const localBreakpoints = clientLines.map(line => { // For sending to C-SPY
            return { line: this.convertClientLineToDebugger(line), id: this.bpIndex++ }
        });
        const cspyRequest = {
            breakpoints: localBreakpoints,
            file: basename(args.source.path!!)
        };

        const newLocal = this;
        this.cSpyRClient.sendCommandWithCallback("setBreakpoints", cspyRequest, function (cspyResponse) {
            const actualBreakpoints = localBreakpoints.map(b => { // For sending to DAP client
                const verifiedBps: number[] = cspyResponse;
                return new Breakpoint(verifiedBps.includes(b.id),
                    newLocal.convertDebuggerLineToClient(b.line));
            })

            response.body = {
                breakpoints: actualBreakpoints
            };
            newLocal.sendResponse(response);
        });
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
        const contextInfos = await this.cspyContexts.service.getStack(this.currentInspectionContext, 0, -1);
        console.log(contextInfos);

        this.contextReferences = contextInfos.map(contextInfo => contextInfo.context);

        const frames = contextInfos.map((contextInfo, i) => {
            if (contextInfo.sourceRanges.length > 0) {
                const filename = contextInfo.sourceRanges[0].filename;
                return new StackFrame(
                    i, contextInfo.functionName, new Source(basename(filename), filename), contextInfo.sourceRanges[0].first.line, contextInfo.sourceRanges[0].first.col
                );
            } else {
                return new StackFrame(
                    i, contextInfo.functionName // TODO: maybe add a Source that points to memory or disasm window
                );
            }
        });
        response.body = {
            stackFrames: frames,
            totalFrames: frames.length,
        }
        this.sendResponse(response);
        this.performDisassemblyEvent();
    }

    protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
        console.log("Scopes");
        const frameReference = args.frameId;
        const scopes = new Array<Scope>();
        scopes.push(new Scope("Local", this.variableHandles.create(new ScopeReference("local", frameReference)), false));
        scopes.push(new Scope("Static", this.variableHandles.create(new ScopeReference("static", frameReference)), false));
        scopes.push(new Scope("Registers", this.variableHandles.create(new ScopeReference("registers", frameReference)), false));

        response.body = {
            scopes: scopes
        };
        this.sendResponse(response);
    }

    protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
        console.log("Variables");
        const scopeRef = this.variableHandles.get(args.variablesReference);
        const context = this.contextReferences[scopeRef.frameReference];

        const variables: DebugProtocol.Variable[] = [];

        const staticVars = [];
        const registerVars = [];

        let requestedVars: Symbol[] = [];
        switch (scopeRef.name) {
            case "local":
                requestedVars = await this.cspyContexts.service.getLocals(context);
                break;
            case "static":
                requestedVars = staticVars;
                break;
            case "registers":
                requestedVars = registerVars;
                break;
        }

        for (let i = 0; i < requestedVars.length; i++) {
            const variable = requestedVars[i];
            variables.push({
                name: variable.name,
                type: "", // technically, we should only porivde this if the client has specified that it supports it
                value: "", // (await this._cspyDebugger.service.evalExpression(context, variable.name, [], ExprFormat.kNoCustom, false)).value,
                variablesReference: 0
            });
        }

        response.body = {
            variables: variables
        };
        this.sendResponse(response);
    }

    protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments) {
        const scopeRef = this.variableHandles.get(args.variablesReference);

        const requestBody = {
            name: args.name,
            value: args.value,
            frame: scopeRef.frameReference
        };
        const newLocal = this;
        this.cSpyRClient.sendCommandWithCallback("setVariable", requestBody, function (cspyResponse) {
            if (cspyResponse.success) {
                if (scopeRef.name === "registers") {
                    // C-SPY returns the new value as decimal, even when it's a register.
                    // We want it as hex. TODO: fix formatting
                    // cspyResponse.response = parseInt(cspyResponse.response, 10).toString(16);
                }
                response.body = {
                    value: cspyResponse.response,
                }
            } else {
                response.success = false;
            }
            newLocal.sendResponse(response);
        });
    }


    protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
        console.log("Eval");
        const newLocal = this;
        // return this._cspyDebugger.service.evalExpression();
        const requestBody = {
            expression: args.expression,
            frame: args.frameId
        };
        this.cSpyRClient.sendCommandWithCallback("evaluate", requestBody, function (cspyResponse) { // TODO: handle frameId argument
            response.body = {
                result: cspyResponse,
                variablesReference: 0
            }
            newLocal.sendResponse(response);
        });
    }

    protected customRequest(command: string, response: DebugProtocol.Response, _: any): void {
        switch (command) {
            case "istepOver":
                this.cSpyRClient.sendCommandWithCallback("istepOver", "", this.stopEventCallback("step"));
                break;
            case "istepInto":
                this.cSpyRClient.sendCommandWithCallback("istepInto", "", this.stopEventCallback("step"));
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
        this.cSpyRClient.sendCommandWithCallback("disassembly", "", (cspyResponse) => {
            this.sendEvent({
                event: "disassembly",
                body: cspyResponse,
                seq: this.eventSeq++,
                type: "event",
            });
        });
    }

    private async endSession() {
        console.log("Killing session");
        this.cspyContexts.close();
        this.cspyBreakpoints.close();
        this.cspyDebugger.close();
        await this.serviceManager.stop();
    }
}
DebugSession.run(CSpyDebugSession);