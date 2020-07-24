import * as Thrift from "thrift";
import { Disposable } from "../disposable";

/**
 * A client connected to a thrift service. The owner is responsible for
 * disposing of the client when done with it.
 */
export class ThriftClient<T> implements Disposable {
    private closed = false;

    constructor(private readonly connection: Thrift.Connection, private readonly _service: T) {
        this.connection.on("close", () => {
            this.closed = true;
        });
    }

    get service(): T {
        return this._service;
    }

    /**
     * Disconnect the client. Do not use the client after closing it.
     */
    dispose() {
        if (!this.closed) {
            this.connection.end();
        }
    }
}