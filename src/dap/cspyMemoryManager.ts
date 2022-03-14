import Int64 = require("node-int64");
import * as Memory from "./thrift/bindings/CSpyMemory";
import { MEMORY_SERVICE } from "./thrift/bindings/cspy_types";
import { Location, Zone } from "./thrift/bindings/shared_types";
import { ThriftClient } from "./thrift/thriftClient";
import { ThriftServiceManager } from "./thrift/thriftServiceManager";
import { Disposable } from "./disposable";

/**
 * A thin wrapper around the cspy memory lookup service.
 *
 * No (mutable) state is carried here, so it might be better to make
 * this a namespace of pure functions.
 */
export class CspyMemoryManager implements Disposable {
    static async instantiate(serviceMgr: ThriftServiceManager,
    ): Promise<CspyMemoryManager> {
        return new CspyMemoryManager(
            await serviceMgr.findService(MEMORY_SERVICE, Memory.Client),
        );
    }

    constructor(private readonly memory: ThriftClient<Memory.Client>) { }

    // Returns the base64-encoded data, the actual address read from, and the number of bytes read
    async readMemory(address: string, offset: number, count: number): Promise<{ data: string, addr: Int64, count: number }> {
        const addr = add(new Int64(address), offset);
        const data = await this.memory.service.readMemory(new Location({ zone: new Zone({id: -1}), address: addr }), 1, 8, count);
        // The thrift compiler gives incorrect types here; the data is returned as a Buffer, not a string
        return { data: (data as unknown as Buffer).toString("base64"), addr, count: data.length };
    }

    async writeMemory(address: string, offset: number, data: string): Promise<number> {
        const addr = add(new Int64(address), offset);
        const buf = Buffer.from(data, "base64");
        await this.memory.service.writeMemory(new Location({ zone: new Zone({id: -1}), address: addr}), 1, 8, buf.length, buf as unknown as string);
        return buf.length;
    }

    dispose() {
        this.memory.dispose();
    }

}

/**
 * Adds a number to a 64-bit integer and returns the result. On over/underflow, clamps the result to the valid range.
 */
function add(a: Int64, b: number): Int64 {
    // BigInt supercedes Int64 and supports arithmetic. However, we're stuck with Int64 since that's what thrift uses
    const bigA = BigInt("0x"+a.toOctetString()) ;
    const bigB = BigInt(b);
    let result = bigA + bigB;
    if (result < 0n) {
        result = 0n;
    } else if (result > 2n ** 64n - 1n) {
        result = 2n ** 64n - 1n;
    }
    return new Int64(result.toString(16));
}