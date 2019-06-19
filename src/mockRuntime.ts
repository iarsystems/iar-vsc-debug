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
	// the contents (= lines) of the one and only file
	private _sourceLines: string[];

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	private _locals: string;
	private _globals: string;
	private _variables: string;
	private _evaluate: string;
	private _callStack: string[] = [];
	private _validBreakpointIds: number[] = [];

	private net = require('net');
	private client = new this.net.Socket();

	constructor() {
		super();
		const newLocal = this;
		this.client.connect(28561, '127.0.0.1', function() {
			MockRuntime.log('Connected');
			newLocal.client.on('data', function (data) {
				newLocal.eventCallback(data);
			})
		});
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
			MockRuntime.log("unable to parce json (["+ data +"])<#------------------<< "+ e);
			// forget about it :)
		}
		if(callback){
			MockRuntime.log('Received: ' + callback["command"] + "-> " + callback["body"]);
			if(callback["command"] == "continue") {
				this._currentLine = parseInt(callback["body"], 10);
				//console.log("----------> _currentLine: " + this._currentLine);
				this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "launch") {
				this._currentLine = parseInt(callback["body"], 10);
			}
			else if(callback["command"] == "restart") {
				this._currentLine = parseInt(callback["body"], 10);
				//this.sendEvent('stopOnBreakpoint');
			}
			else if(callback["command"] == "next") {
				this._currentLine = parseInt(callback["body"], 10);
				this.sendEvent('stopOnStep');
			}
			else if(callback["command"] == "stepIn") {
				this._currentLine = parseInt(callback["body"], 10);
				this.sendEvent('stopOnStep');
			}
			else if(callback["command"] == "stepOut") {
				this._currentLine = parseInt(callback["body"], 10);
				this.sendEvent('stopOnStep');
			}
			else if(callback["command"] == "variables") {
				this._variables = callback["body"];
				//this.sendEvent('refresh');
			}
			else if(callback["command"] == "evaluate") {
				this._evaluate = callback["body"];
			}
			else if(callback["command"] == "stackTrace") {
				this._callStack = callback["body"];
			}
			else if(callback["command"] == "setBreakpoints") {
				this._validBreakpointIds = callback["body"];
			}
		}
	}

	public sendResponseToCSpy(response: any, callback: () => void) {
		let responseString = JSON.stringify(response);

		this.client.write(responseString + '\n');

		this.client.once('data', function(data){ // TODO: Handle overlapping requests? Or do they even occur?
			callback();
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
	public GetCallStack():string[]{
		return this._callStack;
	}
	public GetVerifiedBpIds():number[]{
		return this._validBreakpointIds;
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
		let update = function(){
			MockRuntime.log("Run");
		}
		this.sendResponseToCSpy(response,update);
	}

	public static log(msg: string) {
		writeFileSync("D:\\repos\\hampusad\\vscode-mock-debug\\runtime.log", msg + "\n", { flag: 'a' });
	}
}