/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import {
	Logger, logger,
	DebugSession, LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, ContinuedEvent, BreakpointEvent, OutputEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';
import { MockRuntime, MockBreakpoint } from './mockRuntime';
//import {EnviromentProvider} from './extension';

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



class MockDebugSession extends LoggingDebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	// a Mock runtime (or debugger)
	private _runtime: MockRuntime;

	private _variableHandles = new Handles<string>();

	// Used to assign a unique Id to each breakpoint
	private _bpIndex = 0;

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("mock-debug.txt");

		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(true);

		this._runtime = new MockRuntime();

		// setup event handlers
		this._runtime.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', MockDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step', MockDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint', MockDebugSession.THREAD_ID));
		});
		this._runtime.on('stopOnException', () => {
			this.sendEvent(new StoppedEvent('exception', MockDebugSession.THREAD_ID));
		});
		this._runtime.on('refresh', () => {
			this.sendEvent(new ContinuedEvent(MockDebugSession.THREAD_ID));
			this.sendEvent(new StoppedEvent('entry', MockDebugSession.THREAD_ID));
		});
		this._runtime.on('output', (text, filePath, line, column) => {
			const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);
			e.body.source = this.createSource(filePath);
			e.body.line = this.convertDebuggerLineToClient(line);
			e.body.column = this.convertDebuggerColumnToClient(column);
			this.sendEvent(e);
		});
		this._runtime.on('end', () => {
			this.sendEvent(new TerminatedEvent());
		});


		//spawn cpyruby
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
		this._runtime.start(args.program, !!args.stopOnEntry);

		//this._envProvider.setPosition();
		let update = function(){
			console.log("launchRequest");
		}
		this._runtime.sendResponseToCSpy(response,update);
		this.sendResponse(response);
	}
	protected pauseRequest(response: DebugProtocol.PauseResponse)
	{
		let update = function(){
			console.log("pauserequest");
		}
		this._runtime.sendResponseToCSpy(response,update);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {

		const path = <string>args.source.path;
		const clientLines = args.lines || [];

		const localBreakpoints = clientLines.map(line => { // For sending to C-SPY
			return { line: this.convertClientLineToDebugger(line), id: this._bpIndex++ }
			// return new Breakpoint(false, line);
		});

		const newLocal = this;
		let update = function(){
			console.log("setBreakPointsRequest");
			const actualBreakpoints = localBreakpoints.map(b => { // For sending to DAP client
				return new Breakpoint(newLocal._runtime.GetVerifiedBpIds().includes(b.id),
										newLocal.convertDebuggerLineToClient(b.line));
			})

			response.body = {
				breakpoints: actualBreakpoints
			};
			newLocal.sendResponse(response);
		}
		const toCSPY = {command: response.command, body: localBreakpoints}
		this._runtime.sendResponseToCSpy(toCSPY,update);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {

		// runtime supports now threads so just return a default thread.
		response.body = {
			threads: [
				new Thread(MockDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		const newLocal = this;
		this._runtime.sendResponseToCSpy(response, function() {
			const stk = newLocal._runtime.GetCallStack(); // TODO: handle args
			const stackFrames = stk.map((f, i) => new StackFrame(i, f, newLocal.createSource(newLocal._runtime.sourceFile),
																	newLocal.convertDebuggerLineToClient(newLocal._runtime.getLine())));
			response.body = {
				stackFrames: stackFrames,
				totalFrames: stackFrames.length
			}
			newLocal.sendResponse(response);
		});
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

		const frameReference = args.frameId;
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Local", this._variableHandles.create("local_" + frameReference), false));
		scopes.push(new Scope("Global", this._variableHandles.create("global_" + frameReference), true));

		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}

	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {

		var newLocal = this;
		let update = function(){
			const variables = new Array<DebugProtocol.Variable>();
			const id = newLocal._variableHandles.get(args.variablesReference);

			var allVariablesPairs = newLocal._runtime.getVariables().split("*");

			var localPairs = allVariablesPairs[0].split(" ");
			var globalPairs = allVariablesPairs[1].split(" ");

			// var localPairs = this._runtime.getLocals().split(" ");
			// var globalPairs = this._runtime.getGlobals().split(" ");
			if (id == "local_0") {
				for (var i=1;i<localPairs.length;i++) {
					var splitItems = localPairs[i].split("|");
					variables.push({
						name: splitItems[0],
						type: "From CSpy",
						value: splitItems[1],
						variablesReference: 0
					});
				}
			}
			else if (id !== null) {
				for (var i=1;i<globalPairs.length;i++) {
					var splitItems = globalPairs[i].split("|");
					variables.push({
						name: splitItems[0],
						type: "From CSpy",
						value: splitItems[2],
						variablesReference: 0
					});
				}
			}

			response.body = {
				variables: variables
			};
			newLocal.sendResponse(response);
		};

		const allvariables: DebugProtocol.VariablesResponse = <DebugProtocol.VariablesResponse>{
			command:"variables",
		}
		this._runtime.sendResponseToCSpy(allvariables,update);
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this._runtime.continue();
		this.sendResponse(response);
	}

	protected reverseContinueRequest(response: DebugProtocol.ReverseContinueResponse, args: DebugProtocol.ReverseContinueArguments) : void {
		var localThis = this;
		let update = function(){
			localThis.sendResponse(response);
		}
		this._runtime.sendResponseToCSpy(response,update);
	 }

	 protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments) : void {
		var localThis = this;
		let updateresp = function(){
			localThis.sendResponse(response);
			console.log("#####----->Restart!!!one<-------####");
		}
		this._runtime.sendResponseToCSpy(response,updateresp);
	 }

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		var localThis = this;
		let update = function(){
			localThis.sendResponse(response);
		}
		this._runtime.sendResponseToCSpy(response,update);
	}


	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): void {
		var localThis = this;
		let update = function(){
			localThis.sendResponse(response);
		}
		this._runtime.sendResponseToCSpy(response,update);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): void {
		var localThis = this;
		let update = function(){
			localThis.sendResponse(response);
		}
		this._runtime.sendResponseToCSpy(response,update);
	}

	protected stepBackRequest(response: DebugProtocol.StepBackResponse, args: DebugProtocol.StepBackArguments): void {
		//this._runtime.step(true);
		this.sendResponse(response);
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {

		// let reply: string | undefined = undefined;

		// if (args.context === 'repl') {
		// 	// 'evaluate' supports to create and delete breakpoints from the 'repl':
		// 	const matches = /new +([0-9]+)/.exec(args.expression);
		// 	if (matches && matches.length === 2) {
		// 		const mbp = this._runtime.setBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
		// 		const bp = <DebugProtocol.Breakpoint> new Breakpoint(mbp.verified, this.convertDebuggerLineToClient(mbp.line), undefined, this.createSource(this._runtime.sourceFile));
		// 		bp.id= mbp.id;
		// 		this.sendEvent(new BreakpointEvent('new', bp));
		// 		reply = `breakpoint created`;
		// 	} else {
		// 		const matches = /del +([0-9]+)/.exec(args.expression);
		// 		if (matches && matches.length === 2) {
		// 			const mbp = this._runtime.clearBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
		// 			if (mbp) {
		// 				const bp = <DebugProtocol.Breakpoint> new Breakpoint(false);
		// 				bp.id= mbp.id;
		// 				this.sendEvent(new BreakpointEvent('removed', bp));
		// 				reply = `breakpoint deleted`;
		// 			}
		// 		}
		// 	}
		// }

		response.body = {
			result: args.expression,
			variablesReference: 0
		};
		console.log("evaluateRequest()----->" + args.expression);

		var localThis = this;
		let update = function(){
			console.log("evaluateRequest() update----->" + args.expression);
			let val = localThis._runtime.GetEvaluate();
			response.body.result = val;
			localThis.sendResponse(response);
		}
		this._runtime.sendResponseToCSpy(response,update);
	}

	//---- helpers

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
	}
}

DebugSession.run(MockDebugSession);
