/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import {
    LegacyListwindowClient,
    LegacyToolbarItem,
} from "./listwindowBackendClient";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ToolbarItemType } from "../../../webviews/listwindow/rendering/toolbar/toolbarConstants";
import * as Q from "q";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as SymbolicMemory from "iar-vsc-common/thrift/bindings/SymbolicMemory";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";

export class SymbolicMemoryClient extends LegacyListwindowClient<SymbolicMemory.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(
            serviceName,
            serviceRegistry,
            SymbolicMemory.Client,
        );
    }

    private async getItems(): Promise<LegacyToolbarItem[]> {
        let zones: string[] = [];
        if (this.client) {
            zones = await this.client.service.getZoneList();
        }
        return [
            {
                id: "goto",
                type: ToolbarItemType.kKindEditText,
                text: "Go to:",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: "",
                tooltip: "Go to location",
                callback: tree => {
                    return this.goTo(tree);
                },
            },
            {
                id: "memorySelection",
                type: ToolbarItemType.kKindSelectMenuDyn,
                text: "",
                bool: true,
                itemKey: "",
                stringList: zones,
                text2: "",
                tooltip: "Select memory configuration",
                callback: tree => {
                    return this.setMemoryLocation(tree);
                },
            },
            {
                id: "previousButton",
                type: ToolbarItemType.kKindTextButton,
                text: "Previous",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: "",
                tooltip: "Go to previous location",
                callback: _tree => {
                    return this.doPrevious();
                },
            },
            {
                id: "nextButton",
                type: ToolbarItemType.kKindTextButton,
                text: "Next",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: "",
                tooltip: "Go to next location",
                callback: _tree => {
                    return this.doNext();
                },
            },
        ];
    }

    private doNext() {
        return this.withClient<boolean>(c => {
            return c.service.nextSymbol().then(() => Q.resolve(true));
        }, false);
    }

    private doPrevious() {
        return this.withClient<boolean>(c => {
            return c.service.prevSymbol().then(() => Q.resolve(true));
        }, false);
    }

    private goTo(tree: PropertyTreeItem) {
        const adress = tree.children[1]?.value as string;
        return this.withClient<boolean>(c => {
            return c.service.navigate(adress).then(() => Q.resolve(true));
        }, false);
    }

    private setMemoryLocation(tree: PropertyTreeItem) {
        const location = tree.children[1]?.value as string;
        return this.withClient<boolean>(c => {
            return c.service.setZone(location).then(() => Q.resolve(true));
        }, false);
    }

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve().then(async() => {
            const items = await this.getItems();
            return Q.resolve(items);
        });
    }
}
