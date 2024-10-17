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
import * as QuickWatch from "iar-vsc-common/thrift/bindings/QuickWatch";

/**
 *  Quickwatch client
 */
export class QuickWatchClient extends LegacyListwindowClient<QuickWatch.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(serviceName, serviceRegistry, QuickWatch.Client);
    }

    private readonly def: LegacyToolbarItem[] = [
        {
            id: "reload",
            type: ToolbarItemType.kKindIconButton,
            text: "IDI_DBG_QWATCH_RECALCULATE",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "",
            callback: tree => {
                return this.onEval(tree);
            },
        },
        {
            id: "edit",
            type: ToolbarItemType.kKindEditTextDyn,
            text: "",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "",
            callback: tree => {
                return this.onEdit(tree);
            },
        },
    ];

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve(this.def);
    }

    private latestEval = "";
    public onEdit(tree: PropertyTreeItem): Q.Promise<boolean> {
        this.latestEval = tree.children[1]?.value as string;
        return this.onEval(tree);
    }

    public onEval(_tree: PropertyTreeItem): Q.Promise<boolean> {
        return this.withClient<boolean>(c => {
            return c.service.
                evaluate(this.latestEval).
                then(() => Q.resolve(true));
        }, false);
    }
}
