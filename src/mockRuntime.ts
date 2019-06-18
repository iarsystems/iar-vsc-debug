/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { readFileSync, writeFileSync } from 'fs';
import { EventEmitter } from 'events';
import { DebugProtocol } from 'vscode-debugprotocol';
//import { Response } from 'vscode-debugadapter/lib/main';

export interface MockBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

/**
 * A Mock runtime with minimal debugger functionality.
 */
export class MockRuntime extends EventEmitter {

	// the initial (and one and only) file we are 'debugging'
	private _sourceFile: string;
	public get sourceFile() {
		return this._sourceFile;
	}
	stackTrace
	// the contents (= lines) of the one and only file
	private _sourceLines: string[];

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	// maps from sourceFile to array of Mock breakpoints
	private _breakPoints = new Map<string, MockBreakpoint[]>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;

	private _locals: string;
	private _globals: string;
	private _variables: string
	private _evaluate: string

	private net = require('net');
	private client = new this.net.Socket();

	constructor() {
		super();
		const newLocal = this;
		this.client.connect(28561, '127.0.0.1', function() {
			newLocal.log('Connected');
		});

		//this.client.setMaxListeners(25);
	}

	private sendEvent(event: string, ... args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}

	public eventCallback = (data)  => {
		var ab2str = require('arraybuffer-to-string');
		let callback = null;
		try {
			callback = JSON.parse(ab2str(data));
		}
		catch(e) {
			this.log("unable to parce json (["+ data +"])<#------------------<< "+ e);
			// forget about it :)
		}
		if(callback){
			this.log('Received: ' + callback["command"] + "-> " + callback["body"]);
			if(callback["command"] == "continue") {
				this._currentLine = parseInt(callback["body"], 10) -1;
				//console.log("----------> _currentLine: " + this._currentLine);
				this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "launch") {
				this._currentLine = parseInt(callback["body"], 10) -1;
			}
			else if(callback["command"] == "restart") {
				this._currentLine = parseInt(callback["body"], 10) -1;
				//this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "next") {
				this._currentLine = parseInt(callback["body"], 10) -1;
				this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "stepIn") {
				this._currentLine = parseInt(callback["body"], 10) -1;
				this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "stepOut") {
				this._currentLine = parseInt(callback["body"], 10) -1;
				this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "variables") {
				this._variables = callback["body"];
				//this.sendEvent('refresh');
			}
			else if(callback["command"] == "evaluate") {
				this._evaluate = callback["body"];
			}
		}
	}

	// public sendResponseToCSpy(response: DebugProtocol.Response) {
	// 	let responseString = JSON.stringify(response);
	// 	//logger.verbose(`To client: ${responseString }`);

	// 	this.client.write(responseString + '\n');

	// 	this.client.on('data', this.eventCallback)

	// 	//this.client.off('data', eventCallback);
	// }

	public sendResponseToCSpy(response: DebugProtocol.Response, update) {
		let responseString = JSON.stringify(response);

		this.client.write(responseString + '\n');
		var newLocal = this;

		this.client.on('data', function(data){
			newLocal.eventCallback(data);
			update();
		})

	}

	public getLocals():string
	{
		return this._locals;
	}
	public getLine()
	{
		return this._currentLine;
	}
	public getGlobals():string
	{
		return this._globals;
	}
	public getVariables():string{
		return this._variables;
	}
	public GetEvaluate():string{
		return this._evaluate;
	}

	/**
	 * Start executing the given program.
	 */
	public start(program: string, stopOnEntry: boolean) {

		this._locals = "";
		this._globals = "";
		this._variables = "*";

		this.loadSource(program);
		//this._currentLine = 0;

		this.verifyBreakpoints(this._sourceFile);

		if (stopOnEntry) {
			// we step once
			//this.step(false, 'stopOnEntry');
			this.sendEvent('stopOnEntry');
		} else {
			// we just start to run until we hit a breakpoint or an exception
			this.continue();
		}
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public continue(reverse = false) {
		if(reverse)
			this._currentLine = 0;
		else
			this.run();
	}

	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public stack(startFrame: number, endFrame: number): any {

		const words = this._sourceLines[this._currentLine].trim().split(/\s+/);

		const frames = new Array<any>();
		// every word of the current line becomes a stack frame.
		for (let i = startFrame; i < Math.min(endFrame, words.length); i++) {
			const name = words[i];	// use a word of the line as the stackframe name
			frames.push({
				index: i,
				name: `${name}(${i})`,
				file: this._sourceFile,
				line: this._currentLine
			});
		}
		return {
			frames: frames,
			count: words.length
		};
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public setBreakPoint(path: string, line: number) : MockBreakpoint {

		const bp = <MockBreakpoint> { verified: false, line, id: this._breakpointId++ };
		let bps = this._breakPoints.get(path);
		if (!bps) {
			bps = new Array<MockBreakpoint>();
			this._breakPoints.set(path, bps);
		}
		bps.push(bp);

		this.verifyBreakpoints(path);

		return bp;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number) : MockBreakpoint | undefined {
		let bps = this._breakPoints.get(path);
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		this._breakPoints.delete(path);
	}

	// private methods

	private loadSource(file: string) {
		if (this._sourceFile !== file) {
			this._sourceFile = file;
			this._sourceLines = readFileSync(this._sourceFile).toString().split('\n');
		}
	}

	/**
	 * Run through the file.
	 * If stepEvent is specified only run a single step and emit the stepEvent.
	 */
	private run() {
		const response: DebugProtocol.ContinueResponse = <DebugProtocol.ContinueResponse>{
			command:"continue",
			body:{
				allThreadsContinued:true
			}
		}
		const newLocal = this;
		let update = function(){
			newLocal.log("Run");
		}
		this.sendResponseToCSpy(response,update);
	}

	private verifyBreakpoints(path: string) : void {
		let bps = this._breakPoints.get(path);
		if (bps) {
			this.loadSource(path);
			bps.forEach(bp => {
				if (!bp.verified && bp.line < this._sourceLines.length) {
					const srcLine = this._sourceLines[bp.line].trim();

					// if a line is empty or starts with '+' we don't allow to set a breakpoint but move the breakpoint down
					if (srcLine.length === 0 || srcLine.indexOf('+') === 0) {
						bp.line++;
					}
					// if a line starts with '-' we don't allow to set a breakpoint but move the breakpoint up
					if (srcLine.indexOf('-') === 0) {
						bp.line--;
					}
					// don't set 'verified' to true if the line contains the word 'lazy'
					// in this case the breakpoint will be verified 'lazy' after hitting it once.
					if (srcLine.indexOf('lazy') < 0) {
						bp.verified = true;
						this.sendEvent('breakpointValidated', bp);
					}
				}
			});
		}
	}

	private log(msg: string) {
		writeFileSync("D:\\repos\\hampusad\\vscode-mock-debug\\runtime.log", msg + "\n", { flag: 'a' });
	}

	/**
	 * Fire events if line has a breakpoint or the word 'exception' is found.
	 * Returns true is execution needs to stop.
	 */
	// private fireEventsForLine(ln: number, stepEvent?: string): boolean {

	// 	const line = this._sourceLines[ln].trim();

	// 	// if 'log(...)' found in source -> send argument to debug console
	// 	const matches = /log\((.*)\)/.exec(line);
	// 	if (matches && matches.length === 2) {
	// 		this.sendEvent('output', matches[1], this._sourceFile, ln, matches.index)
	// 	}

	// 	// if word 'exception' found in source -> throw exception
	// 	if (line.indexOf('exception') >= 0) {
	// 		this.sendEvent('stopOnException');
	// 		return true;
	// 	}

	// 	// is there a breakpoint?
	// 	const breakpoints = this._breakPoints.get(this._sourceFile);
	// 	if (breakpoints) {
	// 		const bps = breakpoints.filter(bp => bp.line === ln);
	// 		if (bps.length > 0) {

	// 			// send 'stopped' event
	// 			this.sendEvent('stopOnBreakpoint');

	// 			// the following shows the use of 'breakpoint' events to update properties of a breakpoint in the UI
	// 			// if breakpoint is not yet verified, verify it now and send a 'breakpoint' update event
	// 			if (!bps[0].verified) {
	// 				bps[0].verified = true;
	// 				this.sendEvent('breakpointValidated', bps[0]);
	// 			}
	// 			return true;
	// 		}
	// 	}

	// 	// non-empty line
	// 	if (stepEvent && line.length > 0) {
	// 		this.sendEvent(stepEvent);
	// 		return true;
	// 	}

	// 	// nothing interesting found -> continue
	// 	return false;
	// }
}