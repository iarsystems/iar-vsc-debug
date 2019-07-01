import { DebugProtocol } from "vscode-debugprotocol";
import { LoggingDebugSession, Handles, StoppedEvent, OutputEvent, TerminatedEvent, InitializedEvent, logger, Logger, Breakpoint, Thread, Source, StackFrame, Scope, DebugSession } from "vscode-debugadapter";
import { CSpyRubyServer } from "./cspyRubyServer";
import { basename } from "path";

/**
 * This interface describes the mock-debug specific launch attributes
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of the mock-debug extension.
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
}

/**
 * Desribes a scope, i.e. a name (local or static) and a frame reference (the 'frame level')
 */
class ScopeReference {
	constructor(
		readonly name: "local" | "static" | "registers",
		readonly frameReference: number,
	) {}
}

class CSpyDebugSession extends LoggingDebugSession {
	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	// a Mock runtime (or debugger)
	private _cSpyRServer: CSpyRubyServer;

	private _variableHandles = new Handles<ScopeReference>();

	// Used to assign a unique Id to each breakpoint
	private _bpIndex = 0;

	// Sequence number for custom events
	private _eventSeq = 0;

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("mock-debug.txt");

		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		this._cSpyRServer = new CSpyRubyServer();

	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsRestartRequest = true;
		response.body.supportsSetVariable = true;

		// make VS Code to show a 'step back' button
		//response.body.supportsStepBack = true;

		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		// make sure to 'Stop' the buffered logging if 'trace' is not set
		logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

		//spawn cspyruby
		var spawn = require('child_process').execFile;

		let ewPath = args.workbenchPath;
		if (!ewPath.endsWith('/')) ewPath += '/'
		const ls = spawn(ewPath + 'common/bin/CSpyRuby.exe',
		['--ruby_file', '../../CSPYRubySetup/setupt.rb','--config', 'SIM_CORTEX_M4', '--program', args.program],
		{ cwd: __dirname });
		CSpyRubyServer.log("starting cspuruby, PID: "+ ls.pid );

		// sleep a little bit to make sure cspy ruby starts before continue
		var sleep = require('system-sleep');
		sleep(2000);

		ls.stdout.on('data', (data) => {
			CSpyRubyServer.log('stdout: ' + data);
			const e: DebugProtocol.OutputEvent = new OutputEvent(data);
			this.sendEvent(e);
		});

		ls.stderr.on('data', (data) => {
			CSpyRubyServer.log('stderr: ' + data);
		});

		ls.on('close', (code) => {
			CSpyRubyServer.log('child process exited with code ' + code);
		});

		// start the program in the runtime
		if (!!args.stopOnEntry) {
			this._cSpyRServer.sendCommandWithCallback("launch", "", this.stepRunCallback("entry"));
		} else {
			this._cSpyRServer.sendCommandWithCallback("continue", "", this.stepRunCallback("breakpoint"));
		}

		this.sendResponse(response);
	}

	protected pauseRequest(response: DebugProtocol.PauseResponse) {
		this._cSpyRServer.sendCommandWithCallback("pause", "", this.stepRunCallback("pause"));
		this.sendResponse(response);
	}
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this._cSpyRServer.sendCommandWithCallback("continue", "", this.stepRunCallback("breakpoint"));
		this.sendResponse(response);
	}

	protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments): void {
		this._cSpyRServer.sendCommandWithCallback("restart", "", this.stepRunCallback("entry"));
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this._cSpyRServer.sendCommandWithCallback("next", "", this.stepRunCallback("step"));
		this.sendResponse(response);
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		this._cSpyRServer.sendCommandWithCallback("stepIn", "", this.stepRunCallback("step"));
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		this._cSpyRServer.sendCommandWithCallback("stepOut", "", this.stepRunCallback("step"));
		this.sendResponse(response);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		const clientLines = args.lines || [];

		const localBreakpoints = clientLines.map(line => { // For sending to C-SPY
			return { line: this.convertClientLineToDebugger(line), id: this._bpIndex++ }
		});
		const cspyRequest = {
			breakpoints: localBreakpoints,
			file: basename(args.source.path!!)
		};

		const newLocal = this;
		this._cSpyRServer.sendCommandWithCallback("setBreakpoints", cspyRequest, function(cspyResponse) {
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
		this.performDisassemblyEvent();
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

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		const newLocal = this;  // TODO: handle args
		this._cSpyRServer.sendCommandWithCallback("stackTrace", "", function (cspyResponse) {
			const stk: StackFrame[] = [];
			const frames: string[] = cspyResponse;
			for (let i = 0; i < frames.length; i++) {
				const frameData = frames[i].split("|");
				const source = new Source(basename(frameData[1]), frameData[1]);
				stk.push(new StackFrame(i, frameData[0], source, Number(frameData[2]), Number(frameData[3])));
			}
			response.body = {
				stackFrames: stk,
				totalFrames: stk.length
			}
			newLocal.sendResponse(response);
		});
		// also update memory whenever stacktrace is updated
		this._cSpyRServer.sendCommandWithCallback("memory", "", (cspyResponse) => {
			this.sendEvent({
				event: "memory",
				body: cspyResponse,
				seq: this._eventSeq++,
				type: "event",
			});
		});
		this.performDisassemblyEvent();
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		const frameReference = args.frameId;
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Local", this._variableHandles.create(new ScopeReference("local", frameReference)), false));
		scopes.push(new Scope("Static", this._variableHandles.create(new ScopeReference("static", frameReference)), false));
		scopes.push(new Scope("Registers", this._variableHandles.create(new ScopeReference("registers", frameReference)), false));

		response.body = {
			scopes: scopes
		};
		CSpyRubyServer.log(JSON.stringify(scopes));
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		const scopeRef = this._variableHandles.get(args.variablesReference);

		var newLocal = this;
		this._cSpyRServer.sendCommandWithCallback("variables", scopeRef.frameReference, function(cspyResponse) {
			const variables: DebugProtocol.Variable[] = [];

			const allVariablesPairs: string[] = cspyResponse.split("*");

			const localPairs = allVariablesPairs[0].split(" ");
			const staticPairs = allVariablesPairs[1].split(" ");
			const registerPairs = allVariablesPairs[2].split(" ");

			let requestedPairs: string[] = [];
			switch(scopeRef.name) {
				case "local":
					requestedPairs = localPairs;
					break;
				case "static":
					requestedPairs = staticPairs;
					break;
				case "registers":
					requestedPairs = registerPairs;
					break;
			}

			for (var i = 1; i < requestedPairs.length; i++) {
				var splitItems = requestedPairs[i].split("|");
				variables.push({
					name: splitItems[0],
					type: splitItems[2],
					value: splitItems[1],
					variablesReference: 0
				});
			}

			response.body = {
				variables: variables
			};
			newLocal.sendResponse(response);
		});
	}

	protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments) {
		const scopeRef = this._variableHandles.get(args.variablesReference);

		const requestBody = {
			name: args.name,
			value: args.value,
			frame: scopeRef.frameReference
		};
		const newLocal = this;
		this._cSpyRServer.sendCommandWithCallback("setVariable", requestBody, function (cspyResponse) {
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
		const newLocal = this;
		CSpyRubyServer.log("expr: " + args.expression);
		const requestBody = {
			expression: args.expression,
			frame: args.frameId
		};
		this._cSpyRServer.sendCommandWithCallback("evaluate", requestBody, function (cspyResponse) { // TODO: handle frameId argument
			response.body = {
				result: cspyResponse,
				variablesReference: 0
			}
			CSpyRubyServer.log(JSON.stringify(response));
			newLocal.sendResponse(response);
		});
	}

	// Generic callback for events like run/step etc., that should send back a StoppedEvent on return
	private stepRunCallback(stopReason: "entry" | "step" | "breakpoint" | "pause") {
		const newLocal = this;
		return function(debugeeTerminated: boolean) {
			if (!debugeeTerminated) {
				// ideally, the stop reason should be determined from C-SPY, but this is good enough
				newLocal.sendEvent(new StoppedEvent(stopReason, CSpyDebugSession.THREAD_ID));
			} else {
				newLocal.sendEvent(new TerminatedEvent());
			}
		}
	}

	private performDisassemblyEvent() {
		this._cSpyRServer.sendCommandWithCallback("disassembly", "", (cspyResponse) => {
			this.sendEvent({
				event: "disassembly",
				body: cspyResponse,
				seq: this._eventSeq++,
				type: "event",
			});
		});
	}
}
DebugSession.run(CSpyDebugSession);