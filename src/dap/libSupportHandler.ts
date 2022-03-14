

import * as Q from "q";

/**
 * Implements the LibSupport thrift service.
 */
export class LibSupportHandler {
    private readonly outputCallbacks: Array<(data: string) => void> = [];
    private readonly exitCallbacks: Array<(code: number) => void> = [];

    private readonly inputRequestedCallbacks: Array<() => void> = [];
    // When we have more input than has been requested, it is placed into the buffer.
    // When we have more requested input than the user has provided, we store the requests in the queue.
    private inputBuffer = Buffer.alloc(0);
    private bufferPosition = 0;
    // A FIFO queue of all pending input requests
    private readonly requestQueue: Array<{ len: number, resolve: (s: string) => void}> = [];

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

    /**
     * Registers a callback to run when the debugee requests console input
     */
    public observeInputRequest(callback: () => void) {
        this.inputRequestedCallbacks.push(callback);
    }

    public isExpectingInput(): boolean {
        return this.requestQueue.length > 0;
    }

    public sendInput(val: Buffer) {
        // Add new input and shave off what we've already used
        this.inputBuffer = Buffer.concat([this.inputBuffer.slice(this.bufferPosition), val]);
        this.bufferPosition = 0;
        // See if we can resolve any waiting requests
        let resolved = 0;
        for (const request of this.requestQueue) {
            if (this.inputBuffer.length - this.bufferPosition < request.len) {
                break;
            }
            request.resolve(this.inputBuffer.slice(this.bufferPosition, this.bufferPosition + request.len).toString());
            this.bufferPosition += request.len;
            resolved++;
        }
        // Remove resolved requests
        this.requestQueue.splice(0, resolved);
    }

    //////
    // Thrift procedure implementations
    //////

    /**
     * Request input from the terminal I/O console.
     */
    requestInputBinary(len: number): Q.Promise<string> {
        console.log("Debugee requested input of length " + len);
        // Can we serve the request immediately?
        if (this.inputBuffer.length - this.bufferPosition >= len) {
            const response = this.inputBuffer.slice(this.bufferPosition, this.bufferPosition + len).toString();
            this.bufferPosition += len;
            return Q.resolve(response);
        } else {
            // push it to the queue and wait for input
            const deferred = Q.defer<string>();
            this.requestQueue.push({ len: len, resolve: deferred.resolve });
            if (this.requestQueue.length === 1) {
                // We weren't already waiting for input
                this.inputRequestedCallbacks.forEach(cb => cb());
            }
            return deferred.promise;
        }
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