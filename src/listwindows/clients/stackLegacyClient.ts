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
import * as Q from "q";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as Stack from "iar-vsc-common/thrift/bindings/Stack";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";

/**
 *  Stack client
 */
export class StackClient extends LegacyListwindowClient<Stack.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(serviceName, serviceRegistry, Stack.Client);
    }

    private async getItems(): Promise<LegacyToolbarItem[]> {
        let stacks: string[] = [];
        if (this.client) {
            stacks = await this.client.service.getStacks();
        }
        return [
            {
                id: "memorySelection",
                type: ToolbarItemType.kKindSelectMenuDyn,
                text: "Stack:",
                bool: true,
                itemKey: "",
                stringList: stacks,
                text2: "",
                callback: tree => {
                    return this.setStack(tree);
                },
            },
            {
                id: "previousButton",
                type: ToolbarItemType.kKindProgressBar,
                text: "",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: "",
                tooltip: "Current stack usage",
            },
        ];
    }

    private setStack(tree: PropertyTreeItem) {
        const stack = tree.children[1]?.value as string;
        return this.withClient<boolean>(c => {
            return c.service.setStack(stack).then(() => Q.resolve(true));
        }, false);
    }

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve().then(async() => {
            const items = await this.getItems();
            return Q.resolve(items);
        });
    }
}
