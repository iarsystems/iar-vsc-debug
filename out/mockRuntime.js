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
    }
    get sourceFile() {
        return this._sourceFile;
    }
    /**
     * Start executing the given program.
     */
    start(program, stopOnEntry) {
        this.loadSource(program);
        this._currentLine = -1;
        this.verifyBreakpoints(this._sourceFile);
        if (stopOnEntry) {
            // we step once
            this.step(false, 'stopOnEntry');
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
        this.run(reverse, undefined);
    }
    /**
     * Step to the next/previous non empty line.
     */
    step(reverse = false, event = 'stopOnStep') {
        this.run(reverse, event);
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
    run(reverse = false, stepEvent) {
        if (reverse) {
            for (let ln = this._currentLine - 1; ln >= 0; ln--) {
                if (this.fireEventsForLine(ln, stepEvent)) {
                    this._currentLine = ln;
                    return;
                }
            }
            // no more lines: stop at first line
            this._currentLine = 0;
            this.sendEvent('stopOnEntry');
        }
        else {
            for (let ln = this._currentLine + 1; ln < this._sourceLines.length; ln++) {
                if (this.fireEventsForLine(ln, stepEvent)) {
                    this._currentLine = ln;
                    return true;
                }
            }
            // no more lines: run to end
            this.sendEvent('end');
        }
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
    /**
     * Fire events if line has a breakpoint or the word 'exception' is found.
     * Returns true is execution needs to stop.
     */
    fireEventsForLine(ln, stepEvent) {
        const line = this._sourceLines[ln].trim();
        // if 'log(...)' found in source -> send argument to debug console
        const matches = /log\((.*)\)/.exec(line);
        if (matches && matches.length === 2) {
            this.sendEvent('output', matches[1], this._sourceFile, ln, matches.index);
        }
        // if word 'exception' found in source -> throw exception
        if (line.indexOf('exception') >= 0) {
            this.sendEvent('stopOnException');
            return true;
        }
        // is there a breakpoint?
        const breakpoints = this._breakPoints.get(this._sourceFile);
        if (breakpoints) {
            const bps = breakpoints.filter(bp => bp.line === ln);
            if (bps.length > 0) {
                // send 'stopped' event
                this.sendEvent('stopOnBreakpoint');
                // the following shows the use of 'breakpoint' events to update properties of a breakpoint in the UI
                // if breakpoint is not yet verified, verify it now and send a 'breakpoint' update event
                if (!bps[0].verified) {
                    bps[0].verified = true;
                    this.sendEvent('breakpointValidated', bps[0]);
                }
                return true;
            }
        }
        // non-empty line
        if (stepEvent && line.length > 0) {
            this.sendEvent(stepEvent);
            return true;
        }
        // nothing interesting found -> continue
        return false;
    }
    sendEvent(event, ...args) {
        setImmediate(_ => {
            this.emit(event, ...args);
        });
    }
}
exports.MockRuntime = MockRuntime;
//# sourceMappingURL=mockRuntime.js.map