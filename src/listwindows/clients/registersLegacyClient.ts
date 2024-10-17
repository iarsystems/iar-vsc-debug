/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import {
    LegacyListwindowClient,
    LegacyToolbarItem,
} from "./listwindowBackendClient";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ToolbarItemType } from "../../../webviews/shared/rendering/toolbar/toolbarConstants";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Q from "q";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as Watch from "iar-vsc-common/thrift/bindings/Watch";

/**
 * Legacy client for registers.
 */
export class RegisterClient extends LegacyListwindowClient<Watch.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(serviceName, serviceRegistry, Watch.Client);
    }

    private readonly def: LegacyToolbarItem[] = [
        {
            id: "edit",
            type: ToolbarItemType.kKindEditText,
            text: "Find register:",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "",
            callback: tree => {
                return this.onFind(tree);
            },
        },
    ];

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve(this.def);
    }

    public onFind(tree: PropertyTreeItem): Q.Promise<boolean> {
        const register = tree.children[1]?.value as string;
        return this.withClient<boolean>(c => {
            return c.service.
                add(register.replace(" ", "")).
                then(() => Q.resolve(true));
        }, false);
    }
}
