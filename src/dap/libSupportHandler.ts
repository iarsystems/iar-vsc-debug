

import * as Q from "q";

/**
 * Implements the LibSupport thrift service.
 */
export class LibSupportHandler {
    private readonly outputCallbacks: Array<(data: string) => void> = [];
    private readonly exitCallbacks: Array<(code: number) => void> = [];

    /**
     * Registers a callback to run when the debugee produces some output
     */
    public observeOutput(callback: (data: string) => void) {
        this.outputCallbacks.push(callback);
    }

    /**
     * Registers a callback to run when the debugee exits
     */
    public observeExit(callback: (code: number) => void) {
        this.exitCallbacks.push(callback);
    }

    //////
    // Thrift procedure implementations
    //////

    /**
     * Request input from the terminal I/O console.
     */
    requestInputBinary(_len: number): Q.Promise<string> {
        // TODO: implement
        // The implementation will be slightly complicated, since DAP doesn't support any way to request
        // console input from the user. Instead, we have to set some state indicating that we're waiting
        // on user input, which tells the 'Evaluate' request handler to send the next REPL input here,
        // so we can send it back to C-SPY.
        // A better way might be to use cspybat instead of the thrift libsupport, and use the RunInTerminal
        // reverse request to create a terminal we can use for user I/O.
        return Q.resolve("");
    }

    /**
     * Handle output from the target program.
     */
    printOutputBinary(data: string): Q.Promise<void> {
        this.outputCallbacks.forEach(cb => cb(data.toString()));
        return Q.resolve();
    }

    /**
     * The target program has exited.
     */
    exit(code: number): Q.Promise<void> {
        this.exitCallbacks.forEach(cb => cb(code));
        return Q.resolve();
    }


    /**
     * The target program has aborted (i.e. called abort()).
     */
    reportAssert(_file: string, _line: string, _message: string): Q.Promise<void> {
        // No need to implement this for now, since it triggers a logevent anyway
        return Q.resolve();
    }
}