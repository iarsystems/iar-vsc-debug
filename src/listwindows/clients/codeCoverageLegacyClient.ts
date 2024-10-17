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
import { Int64 } from "thrift";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as CodeCoverage from "iar-vsc-common/thrift/bindings/CodeCoverage";
import { CODECOVERAGE_SERVICE } from "iar-vsc-common/thrift/bindings/codecoverage_types";
import { ToolbarItemState } from "iar-vsc-common/thrift/bindings/listwindow_types";

/**
 *  Code coverage client
 */
export class CodeCoverageClient extends LegacyListwindowClient<ListWindowBackend.Client> {
    private codeCoverageClient: ThriftClient<CodeCoverage.Client> | undefined = undefined;

    public async connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        this.codeCoverageClient = await serviceRegistry.findService(
            CODECOVERAGE_SERVICE,
            CodeCoverage.Client,
        );
        return this.doConnect(
            serviceName,
            serviceRegistry,
            ListWindowBackend.Client,
        );
    }

    private readonly def: LegacyToolbarItem[] = [
        {
            id: "kToolbarBtnEnable",
            type: ToolbarItemType.kKindIconCheck,
            text: "IDI_CODECOV_ENABLE",
            bool: false,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Enable/Disable",
            callback: () => {
                return this.toggleEnabled();
            },
            state: async() => {
                const codeCovEnabled = await this.isEnabled();
                return new ToolbarItemState({
                    enabled: true,
                    detail: new Int64(0),
                    on: codeCovEnabled,
                    str: "",
                    visible: true,
                });
            }
        },
    ];

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve(this.def);
    }

    private toggleEnabled(): Q.Promise<boolean>  {
        return Q.resolve().then(async() => {
            if (!this.codeCoverageClient) {
                return false;
            }
            const enabled = await this.isEnabled();
            await this.codeCoverageClient.service.enable(!enabled);
            return true;
        });
    }

    private isEnabled(): Q.Promise<boolean> {
        if (!this.codeCoverageClient) {
            return Q.resolve(false);
        }
        return this.codeCoverageClient.service.isEnabled();
    }
}
