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
}

/**
 * Desribes a scope, i.e. a name (local or static) and a frame reference (the 'frame level')
 */
class ScopeReference {
	constructor(
		readonly name: "local" | "static",
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

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("mock-debug.txt");
		CSpyRubyServer.log("started");

		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		this._cSpyRServer = new CSpyRubyServer();

		//spawn cspyruby
		var spawn = require('child_process').execFile;

		const ls = spawn('D:/EWARM_TRUNK/StageWin32_14/Debug/common/bin/CSpyRuby.exe',
		['--ruby_file', 'setupt.rb','--config', 'SIM_CORTEX_M4', '--sourcefile', 'D:/VSCODE_SVN/mock-test/main.c', '--program', 'D:/VSCODE_SVN/mock-test/Debug/Exe/ewproj.out'],
		{cwd:"D:/VSCODE_SVN/CSPYRubySetup"},
		); // TODO:
		console.log("starting cspuruby, PID: "+ ls.pid );

		// sleep a little bit to make sure cspy ruby starts before continue
		var sleep = require('system-sleep');
		sleep(2000);

		ls.stdout.on('data', (data) => {
			console.log('stdout: ' + data);
			const e: DebugProtocol.OutputEvent = new OutputEvent(data);
			this.sendEvent(e);
		});

		ls.stderr.on('data', (data) => {
			console.log('stderr: ' + data);
		});

		ls.on('close', (code) => {
			console.log('child process exited with code ' + code);
		});
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsRestartRequest = true;

		// make VS Code to show a 'step back' button
		//response.body.supportsStepBack = true;

		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		// make sure to 'Stop' the buffered logging if 'trace' is not set
		logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

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
	}
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this._cSpyRServer.sendCommandWithCallback("continue", "", this.stepRunCallback("breakpoint"));
	}

	protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments): void {
		this._cSpyRServer.sendCommandWithCallback("restart", "", this.stepRunCallback("entry"));
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this._cSpyRServer.sendCommandWithCallback("next", "", this.stepRunCallback("step"));
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		this._cSpyRServer.sendCommandWithCallback("stepIn", "", this.stepRunCallback("step"));
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		this._cSpyRServer.sendCommandWithCallback("stepOut", "", this.stepRunCallback("step"));
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		const clientLines = args.lines || [];

		const localBreakpoints = clientLines.map(line => { // For sending to C-SPY
			return { line: this.convertClientLineToDebugger(line), id: this._bpIndex++ }
		});

		const newLocal = this;
		this._cSpyRServer.sendCommandWithCallback("setBreakpoints", localBreakpoints, function(cspyResponse) {
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
			CSpyRubyServer.log("res " + JSON.stringify(response));
			newLocal.sendResponse(response);
		});
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		const frameReference = args.frameId;
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Local", this._variableHandles.create(new ScopeReference("local", frameReference)), false));
		scopes.push(new Scope("Static", this._variableHandles.create(new ScopeReference("static", frameReference)), true));

		response.body = {
			scopes: scopes
		};
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

			const requestedPairs = scopeRef.name == "local" ? localPairs : staticPairs;
			for (var i = 1; i < requestedPairs.length; i++) {
				var splitItems = requestedPairs[i].split("|");
				variables.push({
					name: splitItems[0],
					type: "From CSpy", // TODO:
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


	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		var newLocal = this;
		this._cSpyRServer.sendCommandWithCallback("evaluate", args.expression, function (cspyResponse) {
			response.body.result = cspyResponse;
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
}
DebugSession.run(CSpyDebugSession);