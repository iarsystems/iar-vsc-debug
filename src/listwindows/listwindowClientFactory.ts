/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import {
    AbstractListwindowClient,
    GenericListwindowClient,
    ToolbarInterface,
} from "./clients/listwindowBackendClient";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";

export type CTor<U> = new () => U;
export namespace ServiceClientFactory {
    export async function createServices<T extends ListWindowBackend.Client>(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
        ctor: CTor<AbstractListwindowClient<T>> | undefined,
    ): Promise<[ThriftClient<ListWindowBackend.Client>, ToolbarInterface]> {
        const proxy =
            ctor !== undefined ? new ctor() : new GenericListwindowClient();

        const client = await proxy.connectToBackend(
            serviceName,
            serviceRegistry,
        );
        return [client, proxy];
    }
}
