import { DebugProtocol } from "vscode-debugprotocol";
import { LoggingDebugSession, Handles, StoppedEvent, OutputEvent, TerminatedEvent, InitializedEvent, logger, Logger, Breakpoint, Thread, Source, StackFrame, Scope, DebugSession } from "vscode-debugadapter";
import { CSpyRubyClient } from "./cspyRubyClient";
import { basename } from "path";
import { execFile, ChildProcess } from "child_process";
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
}

/**
 * Desribes a scope, i.e. a name/type (local, static or register) and a frame reference (the 'frame level')
 */
class ScopeReference {
	constructor(
		readonly name: "local" | "static" | "registers",
		readonly frameReference: number,
	) {}
}

/**
 * Manages a debugging session between VS Code and C-SPY (via CSpyRuby)
 * This is the class that implements the Debug Adapter Protocol (at least the
 * parts that aren't already implemented by the DAP SDK)
 */
export class CSpyDebugSession extends LoggingDebugSession {
	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	// the cspyruby process we use to control C-SPY
	private _cspyRubyProc: ChildProcess;

	// our communication channel with the cspyruby instance
	private _cSpyRClient: CSpyRubyClient;

	private _variableHandles = new Handles<ScopeReference>();

	// Used to assign a unique Id to each breakpoint
	private _bpIndex = 0;

	// Sequence number for custom events
	private _eventSeq = 0;

	private _configurationDone = new Subject();

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 */
	public constructor() {
		super("mock-debug.txt");

		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		this._cSpyRClient = new CSpyRubyClient();
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

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsRestartRequest = true;
		response.body.supportsSetVariable = true;

		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}

	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments) {
		super.configurationDoneRequest(response, args);
		this._configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {
		// make sure to 'Stop' the buffered logging if 'trace' is not set
		logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

		//spawn cspyruby
		let ewPath = args.workbenchPath;
		if (!ewPath.endsWith('/')) ewPath += '/'
		this._cspyRubyProc = execFile(ewPath + 'common/bin/CSpyRuby.exe',
		['--ruby_file', '../../CSPYRubySetup/setupt.rb', '--config', 'SIM_CORTEX_M4', '--program', args.program],
		{ cwd: __dirname });
		CSpyRubyClient.log("starting cspuruby, PID: "+ this._cspyRubyProc.pid );


		// wait until configuration is done
		await this._configurationDone.wait(1000);
		// sleep a little bit to make sure cspy ruby starts before continue
/* 		var sleep = require('system-sleep');
		sleep(2000); */

		this._cspyRubyProc.stdout.on('data', (data) => {
			CSpyRubyClient.log('stdout: ' + data);
			const e: DebugProtocol.OutputEvent = new OutputEvent(data.toString());
			this.sendEvent(e);
		});

		this._cspyRubyProc.stderr.on('data', (data) => {
			CSpyRubyClient.log('stderr: ' + data);
		});

		this._cspyRubyProc.on('close', (code) => {
			CSpyRubyClient.log('child process exited with code ' + code);
		});

		// tell cspy to start the program
		if (!!args.stopOnEntry) {
			this._cSpyRClient.sendCommandWithCallback("launch", "", this.stepRunCallback("entry"));
		} else {
			this._cSpyRClient.sendCommandWithCallback("continue", "", this.stepRunCallback("breakpoint"));
		}

		this.sendResponse(response);
	}

	protected terminateRequest(response: DebugProtocol.TerminateResponse, args: DebugProtocol.TerminateArguments) {
		if (this._cspyRubyProc && !this._cspyRubyProc.killed) {
			this._cspyRubyProc.kill();
		}
	}

	protected pauseRequest(response: DebugProtocol.PauseResponse) {
		this._cSpyRClient.sendCommandWithCallback("pause", "", this.stepRunCallback("pause"));
		this.sendResponse(response);
	}
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this._cSpyRClient.sendCommandWithCallback("continue", "", this.stepRunCallback("breakpoint"));
		this.sendResponse(response);
	}

	protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments): void {
		this._cSpyRClient.sendCommandWithCallback("restart", "", this.stepRunCallback("entry"));
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this._cSpyRClient.sendCommandWithCallback("next", "", this.stepRunCallback("step"));
		this.sendResponse(response);
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		this._cSpyRClient.sendCommandWithCallback("stepIn", "", this.stepRunCallback("step"));
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		this._cSpyRClient.sendCommandWithCallback("stepOut", "", this.stepRunCallback("step"));
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
		this._cSpyRClient.sendCommandWithCallback("setBreakpoints", cspyRequest, function(cspyResponse) {
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
		this._cSpyRClient.sendCommandWithCallback("stackTrace", "", function (cspyResponse) {
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
		this._cSpyRClient.sendCommandWithCallback("memory", "", (cspyResponse) => {
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
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		const scopeRef = this._variableHandles.get(args.variablesReference);

		var newLocal = this;
		this._cSpyRClient.sendCommandWithCallback("variables", scopeRef.frameReference, function(cspyResponse) {
			const variables: DebugProtocol.Variable[] = [];

			const localVars = cspyResponse["locals"];
			const staticVars = cspyResponse["statics"];
			const registerVars = cspyResponse["registers"];

			let requestedVars = [];
			switch(scopeRef.name) {
				case "local":
					requestedVars = localVars;
					break;
				case "static":
					requestedVars = staticVars;
					break;
				case "registers":
					requestedVars = registerVars;
					break;
			}

			for (var i = 1; i < requestedVars.length; i++) {
				const variable = requestedVars[i];
				variables.push({
					name: variable["name"],
					type: variable["type"],
					value: variable["value"],
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
		this._cSpyRClient.sendCommandWithCallback("setVariable", requestBody, function (cspyResponse) {
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
		const requestBody = {
			expression: args.expression,
			frame: args.frameId
		};
		this._cSpyRClient.sendCommandWithCallback("evaluate", requestBody, function (cspyResponse) { // TODO: handle frameId argument
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
				this._cSpyRClient.sendCommandWithCallback("istepOver", "", this.stepRunCallback("step"));
				break;
			case "istepInto":
				this._cSpyRClient.sendCommandWithCallback("istepInto", "", this.stepRunCallback("step"));
				break;
		}
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
		this._cSpyRClient.sendCommandWithCallback("disassembly", "", (cspyResponse) => {
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