"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
const vscode_debugadapter_1 = require("vscode-debugadapter");
const path_1 = require("path");
const mockRuntime_1 = require("./mockRuntime");
class MockDebugSession extends vscode_debugadapter_1.LoggingDebugSession {
    /**
     * Creates a new debug adapter that is used for one debug session.
     * We configure the default implementation of a debug adapter here.
     */
    constructor() {
        super("mock-debug.txt");
        this._variableHandles = new vscode_debugadapter_1.Handles();
        // this debugger uses zero-based lines and columns
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);
        this._runtime = new mockRuntime_1.MockRuntime();
        // setup event handlers
        this._runtime.on('stopOnEntry', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('entry', MockDebugSession.THREAD_ID));
        });
        this._runtime.on('stopOnStep', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('step', MockDebugSession.THREAD_ID));
        });
        this._runtime.on('stopOnBreakpoint', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('breakpoint', MockDebugSession.THREAD_ID));
        });
        this._runtime.on('stopOnException', () => {
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('exception', MockDebugSession.THREAD_ID));
        });
        this._runtime.on('refresh', () => {
            this.sendEvent(new vscode_debugadapter_1.ContinuedEvent(MockDebugSession.THREAD_ID));
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent('entry', MockDebugSession.THREAD_ID));
        });
        this._runtime.on('breakpointValidated', (bp) => {
            this.sendEvent(new vscode_debugadapter_1.BreakpointEvent('changed', { verified: bp.verified, id: bp.id }));
        });
        this._runtime.on('output', (text, filePath, line, column) => {
            const e = new vscode_debugadapter_1.OutputEvent(`${text}\n`);
            e.body.source = this.createSource(filePath);
            e.body.line = this.convertDebuggerLineToClient(line);
            e.body.column = this.convertDebuggerColumnToClient(column);
            this.sendEvent(e);
        });
        this._runtime.on('end', () => {
            this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
        });
        //spawn cpyruby
        var spawn = require('child_process').execFile;
        const ls = spawn('D:/EWARM_TRUNK/StageWin32_14/Debug/common/bin/CSpyRuby.exe', ['--ruby_file', 'setupt.rb', '--config', 'SIM_CORTEX_M4', '--sourcefile', 'D:/VSCODE_SVN/mock-test/main.c', '--program', 'D:/VSCODE_SVN/mock-test/Debug/Exe/ewproj.out'], { cwd: "D:/VSCODE_SVN/CSPYRubySetup" });
        console.log("starting cspuruby, PID: " + ls.pid);
        // sleep a little bit to make sure cspy ruby starts before continue
        var sleep = require('system-sleep');
        sleep(2000);
        ls.stdout.on('data', (data) => {
            console.log('stdout: ' + data);
            const e = new vscode_debugadapter_1.OutputEvent(data);
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
    initializeRequest(response, args) {
        // since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
        // we request them early by sending an 'initializeRequest' to the frontend.
        // The frontend will end the configuration sequence by calling 'configurationDone' request.
        this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
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
    launchRequest(response, args) {
        // make sure to 'Stop' the buffered logging if 'trace' is not set
        vscode_debugadapter_1.logger.setup(args.trace ? vscode_debugadapter_1.Logger.LogLevel.Verbose : vscode_debugadapter_1.Logger.LogLevel.Stop, false);
        // start the program in the runtime
        this._runtime.start(args.program, !!args.stopOnEntry);
        //this._envProvider.setPosition();
        let update = function () {
            console.log("launchRequest");
        };
        this._runtime.sendResponseToCSpy(response, update);
        this.sendResponse(response);
    }
    pauseRequest(response) {
        let update = function () {
            console.log("pauserequest");
        };
        this._runtime.sendResponseToCSpy(response, update);
    }
    setBreakPointsRequest(response, args) {
        const path = args.source.path;
        const clientLines = args.lines || [];
        // clear all breakpoints for this file
        this._runtime.clearBreakpoints(path);
        // set and verify breakpoint locations
        const actualBreakpoints = clientLines.map(l => {
            // let { verified, line, id } = this._runtime.setBreakPoint(path, this.convertClientLineToDebugger(l));
            // const bp = <DebugProtocol.Breakpoint> new Breakpoint(verified, this.convertDebuggerLineToClient(line));
            let { verified, line, id } = this._runtime.setBreakPoint(path, l);
            const bp = new vscode_debugadapter_1.Breakpoint(verified, line);
            bp.id = id;
            return bp;
        });
        // send back the actual breakpoint positions
        response.body = {
            breakpoints: actualBreakpoints
        };
        //this.socketMess(JSON.stringify(response));
        let update = function () {
            console.log("setBreakPointsRequest");
        };
        this._runtime.sendResponseToCSpy(response, update);
        this.sendResponse(response);
    }
    threadsRequest(response) {
        // runtime supports now threads so just return a default thread.
        response.body = {
            threads: [
                new vscode_debugadapter_1.Thread(MockDebugSession.THREAD_ID, "thread 1")
            ]
        };
        this.sendResponse(response);
    }
    stackTraceRequest(response, args) {
        const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
        const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
        const endFrame = startFrame + maxLevels;
        const stk = this._runtime.stack(startFrame, endFrame);
        //this._runtime.sendResponseToCSpy(response);
        response.body = {
            stackFrames: stk.frames.map(f => new vscode_debugadapter_1.StackFrame(f.index, f.name, this.createSource(f.file), this.convertDebuggerLineToClient(f.line))),
            totalFrames: stk.count
        };
        this.sendResponse(response);
    }
    scopesRequest(response, args) {
        const frameReference = args.frameId;
        const scopes = new Array();
        scopes.push(new vscode_debugadapter_1.Scope("Local", this._variableHandles.create("local_" + frameReference), false));
        scopes.push(new vscode_debugadapter_1.Scope("Global", this._variableHandles.create("global_" + frameReference), true));
        response.body = {
            scopes: scopes
        };
        this.sendResponse(response);
    }
    variablesRequest(response, args) {
        var newLocal = this;
        let update = function () {
            console.log("----> rel fungtion run???? <----");
            const variables = new Array();
            const id = newLocal._variableHandles.get(args.variablesReference);
            var allVariablesPairs = newLocal._runtime.getVariables().split("*");
            var localPairs = allVariablesPairs[0].split(" ");
            var globalPairs = allVariablesPairs[1].split(" ");
            // var localPairs = this._runtime.getLocals().split(" ");
            // var globalPairs = this._runtime.getGlobals().split(" ");
            if (id == "local_0") {
                for (var i = 1; i < localPairs.length; i++) {
                    var splitItems = localPairs[i].split("-");
                    variables.push({
                        name: splitItems[0],
                        type: "From CSpy",
                        value: splitItems[1],
                        variablesReference: 0
                    });
                }
            }
            else if (id !== null) {
                for (var i = 1; i < globalPairs.length; i++) {
                    var splitItems = globalPairs[i].split("-");
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
        const allvariables = {
            command: "variables",
        };
        this._runtime.sendResponseToCSpy(allvariables, update);
    }
    continueRequest(response, args) {
        this._runtime.continue();
        this.sendResponse(response);
    }
    reverseContinueRequest(response, args) {
        var localThis = this;
        let update = function () {
            localThis.sendResponse(response);
        };
        this._runtime.sendResponseToCSpy(response, update);
    }
    restartRequest(response, args) {
        var localThis = this;
        let updateresp = function () {
            localThis.sendResponse(response);
            console.log("#####----->Restart!!!one<-------####");
        };
        this._runtime.sendResponseToCSpy(response, updateresp);
    }
    nextRequest(response, args) {
        var localThis = this;
        let update = function () {
            localThis.sendResponse(response);
        };
        this._runtime.sendResponseToCSpy(response, update);
    }
    stepInRequest(response, args) {
        var localThis = this;
        let update = function () {
            localThis.sendResponse(response);
        };
        this._runtime.sendResponseToCSpy(response, update);
    }
    stepOutRequest(response, args) {
        var localThis = this;
        let update = function () {
            localThis.sendResponse(response);
        };
        this._runtime.sendResponseToCSpy(response, update);
    }
    stepBackRequest(response, args) {
        //this._runtime.step(true);
        this.sendResponse(response);
    }
    evaluateRequest(response, args) {
        let reply = undefined;
        if (args.context === 'repl') {
            // 'evaluate' supports to create and delete breakpoints from the 'repl':
            const matches = /new +([0-9]+)/.exec(args.expression);
            if (matches && matches.length === 2) {
                const mbp = this._runtime.setBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
                const bp = new vscode_debugadapter_1.Breakpoint(mbp.verified, this.convertDebuggerLineToClient(mbp.line), undefined, this.createSource(this._runtime.sourceFile));
                bp.id = mbp.id;
                this.sendEvent(new vscode_debugadapter_1.BreakpointEvent('new', bp));
                reply = `breakpoint created`;
            }
            else {
                const matches = /del +([0-9]+)/.exec(args.expression);
                if (matches && matches.length === 2) {
                    const mbp = this._runtime.clearBreakPoint(this._runtime.sourceFile, this.convertClientLineToDebugger(parseInt(matches[1])));
                    if (mbp) {
                        const bp = new vscode_debugadapter_1.Breakpoint(false);
                        bp.id = mbp.id;
                        this.sendEvent(new vscode_debugadapter_1.BreakpointEvent('removed', bp));
                        reply = `breakpoint deleted`;
                    }
                }
            }
        }
        response.body = {
            result: reply ? reply : `evaluate(context: '${args.context}', '${args.expression}')`,
            variablesReference: 0
        };
        this.sendResponse(response);
    }
    //---- helpers
    createSource(filePath) {
        return new vscode_debugadapter_1.Source(path_1.basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mock-adapter-data');
    }
}
// we don't support multiple threads, so we can use a hardcoded ID for the default thread
MockDebugSession.THREAD_ID = 1;
vscode_debugadapter_1.DebugSession.run(MockDebugSession);
//# sourceMappingURL=mockDebug.js.map