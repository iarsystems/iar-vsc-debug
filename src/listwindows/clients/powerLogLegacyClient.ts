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
import * as PowerLogSetup from "iar-vsc-common/thrift/bindings/PowerLogSetup";

export class PowerLogSetupClient extends LegacyListwindowClient<PowerLogSetup.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(
            serviceName,
            serviceRegistry,
            PowerLogSetup.Client,
        );
    }

    private async getItems(): Promise<LegacyToolbarItem[]> {
        let actualFreq = "N/A";
        let maxFreq = "N/A";
        if (this.client) {
            actualFreq = (
                await this.client.service.getRateOfSample()
            ).toString();
            maxFreq = (await this.client.service.getMaxRate()).toString();
        }
        return [
            {
                id: "wantedFreq",
                type: ToolbarItemType.kKindEditText,
                text: "Wanted [Hz]:",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: "",
                tooltip: "",
                callback: tree => {
                    return this.setFreq(tree);
                },
            },
            {
                id: "actualFreq",
                type: ToolbarItemType.kKindDisplayText,
                text: "Actual [Hz]:",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: actualFreq,
                tooltip: "",
            },
            {
                id: "maxFreq",
                type: ToolbarItemType.kKindDisplayText,
                text: "Max [Hz]:",
                bool: true,
                itemKey: "",
                stringList: [],
                text2: maxFreq,
                tooltip: "",
            },
        ];
    }

    private setFreq(tree: PropertyTreeItem) {
        const wantedFreq = tree.children[1]?.value as string;
        return this.withClient<boolean>(c => {
            return c.service.
                setRate(Number(wantedFreq)).
                then(() => Q.resolve(true));
        }, false);
    }

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve().then(async() => {
            const items = await this.getItems();
            return Q.resolve(items);
        });
    }
}
