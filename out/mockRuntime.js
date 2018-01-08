"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const events_1 = require("events");
/**
 * A Mock runtime with minimal debugger functionality.
 */
class MockRuntime extends events_1.EventEmitter {
    constructor() {
        super();
        // This is the next line that will be 'executed'
        this._currentLine = 0;
        // maps from sourceFile to array of Mock breakpoints
        this._breakPoints = new Map();
        // since we want to send breakpoint events, we will assign an id to every event
        // so that the frontend can match events with breakpoints.
        this._breakpointId = 1;
        this.net = require('net');
        this.client = new this.net.Socket();
        this.eventCallback = (data) => {
            var ab2str = require('arraybuffer-to-string');
            let callback = null;
            try {
                callback = JSON.parse(ab2str(data));
            }
            catch (e) {
                console.log("unable to parce json ([" + data + "])<#------------------<< " + e);
                // forget about it :)
            }
            if (callback) {
                console.log('Received: ' + callback["command"] + "-> " + callback["body"]);
                if (callback["command"] == "continue") {
                    this._currentLine = parseInt(callback["body"], 10) - 1;
                    //console.log("----------> _currentLine: " + this._currentLine);
                    this.sendEvent('stopOnBreakpoint');
                }
                else if (callback["command"] == "launch") {
                    this._currentLine = parseInt(callback["body"], 10) - 1;
                }
                else if (callback["command"] == "restart") {
                    this._currentLine = parseInt(callback["body"], 10) - 1;
                    //this.sendEvent('stopOnBreakpoint');
                }
                else if (callback["command"] == "next") {
                    this._currentLine = parseInt(callback["body"], 10) - 1;
                    this.sendEvent('stopOnBreakpoint');
                }
                else if (callback["command"] == "stepIn") {
                    this._currentLine = parseInt(callback["body"], 10) - 1;
                    this.sendEvent('stopOnBreakpoint');
                }
                else if (callback["command"] == "stepOut") {
                    this._currentLine = parseInt(callback["body"], 10) - 1;
                    this.sendEvent('stopOnBreakpoint');
                }
                else if (callback["command"] == "variables") {
                    this._variables = callback["body"];
                    //this.sendEvent('refresh');
                }
                else if (callback["command"] == "evaluate") {
                    this._evaluate = callback["body"];
                }
            }
        };
        this.client.connect(28561, '127.0.0.1', function () {
            console.log('Connected');
        });
        //this.client.setMaxListeners(25);
    }
    get sourceFile() {
        return this._sourceFile;
    }
    sendEvent(event, ...args) {
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }
    // public sendResponseToCSpy(response: DebugProtocol.Response) {
    // 	let responseString = JSON.stringify(response);
    // 	//logger.verbose(`To client: ${responseString }`);
    // 	this.client.write(responseString + '\n');
    // 	this.client.on('data', this.eventCallback)
    // 	//this.client.off('data', eventCallback);
    // }
    sendResponseToCSpy(response, update) {
        let responseString = JSON.stringify(response);
        this.client.write(responseString + '\n');
        var newLocal = this;
        this.client.on('data', function (data) {
            newLocal.eventCallback(data);
            update();
        });
    }
    getLocals() {
        return this._locals;
    }
    getLine() {
        return this._currentLine;
    }
    getGlobals() {
        return this._globals;
    }
    getVariables() {
        return this._variables;
    }
    GetEvaluate() {
        return this._evaluate;
    }
    /**
     * Start executing the given program.
     */
    start(program, stopOnEntry) {
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
        }
        else {
            // we just start to run until we hit a breakpoint or an exception
            this.continue();
        }
    }
    /**
     * Continue execution to the end/beginning.
     */
    continue(reverse = false) {
        if (reverse)
            this._currentLine = 0;
        else
            this.run();
    }
    /**
     * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
     */
    stack(startFrame, endFrame) {
        const words = this._sourceLines[this._currentLine].trim().split(/\s+/);
        const frames = new Array();
        // every word of the current line becomes a stack frame.
        for (let i = startFrame; i < Math.min(endFrame, words.length); i++) {
            const name = words[i]; // use a word of the line as the stackframe name
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
    setBreakPoint(path, line) {
        const bp = { verified: false, line, id: this._breakpointId++ };
        let bps = this._breakPoints.get(path);
        if (!bps) {
            bps = new Array();
            this._breakPoints.set(path, bps);
        }
        bps.push(bp);
        this.verifyBreakpoints(path);
        return bp;
    }
    /*
     * Clear breakpoint in file with given line.
     */
    clearBreakPoint(path, line) {
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
    clearBreakpoints(path) {
        this._breakPoints.delete(path);
    }
    // private methods
    loadSource(file) {
        if (this._sourceFile !== file) {
            this._sourceFile = file;
            this._sourceLines = fs_1.readFileSync(this._sourceFile).toString().split('\n');
        }
    }
    /**
     * Run through the file.
     * If stepEvent is specified only run a single step and emit the stepEvent.
     */
    run() {
        const response = {
            command: "continue",
            body: {
                allThreadsContinued: true
            }
        };
        let update = function () {
            console.log("Run");
        };
        this.sendResponseToCSpy(response, update);
    }
    verifyBreakpoints(path) {
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
}
exports.MockRuntime = MockRuntime;
//# sourceMappingURL=mockRuntime.js.map