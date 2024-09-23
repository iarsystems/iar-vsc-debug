/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { LegacyListwindowClient, LegacyToolbarItem } from "./listwindowBackendClient";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ToolbarItemType } from "../../../webviews/listwindow/rendering/toolbar/toolbarConstants";
import { ToolbarItemState } from "iar-vsc-common/thrift/bindings/listwindow_types";
import { Int64 } from "thrift";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Q from "q";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as Trace from "iar-vsc-common/thrift/bindings/TraceListWindowBackend";
import * as vscode from "vscode";


export class TraceClient extends LegacyListwindowClient<Trace.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(serviceName, serviceRegistry, Trace.Client);
    }

    private traceOn = false;
    private mixedModeOn = false;
    private browseModeOn = false;

    private readonly def: LegacyToolbarItem[] = [
        {
            id: "toggleOn",
            type: ToolbarItemType.kKindIconCheck,
            text: "IDI_DBU_TRACE_ONOFF",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Enable/Disable trace",
            callback: tree => {
                return this.toggleOn(tree);
            },
            state: () => {
                return this.canToggleOn();
            },
        },
        {
            id: "spacing1",
            type: ToolbarItemType.kKindSeparator,
            text: "",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
        },
        {
            id: "clear",
            type: ToolbarItemType.kKindIconButton,
            text: "IDI_DBU_TRACE_CLEAR",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Clear",
            callback: _tree => {
                return this.clear();
            },
        },
        {
            id: "browseMode",
            type: ToolbarItemType.kKindIconCheck,
            text: "IDI_DBU_TRACE_BROWSE",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Enable/disable browse mode",
            callback: tree => {
                return this.toggleBrowse(tree);
            },
            state: () => {
                return this.canToggleBrowse();
            },
        },
        {
            id: "toggleSource",
            type: ToolbarItemType.kKindIconCheck,
            text: "IDI_DBU_TRACE_MIXEDMODE",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Enable/disable mixed mode",
            callback: tree => {
                return this.toggleSource(tree);
            },
            state: () => {
                return this.canToggleSource();
            },
        },
        {
            id: "spacing2",
            type: ToolbarItemType.kKindSeparator,
            text: "",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
        },
        {
            id: "search",
            type: ToolbarItemType.kKindIconButton,
            text: "IDI_DBU_TRACE_FIND",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Find in trace",
        },
        {
            id: "save",
            type: ToolbarItemType.kKindIconButton,
            text: "IDI_DBU_PROF_SAVE",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            tooltip: "Save trace to file",
            callback: _tree => {
                return this.save();
            },
        },
    ];

    public async stateAndEnabled(
        state: (c: ThriftClient<Trace.Client>) => Q.Promise<boolean>,
        enabled: (c: ThriftClient<Trace.Client>) => Q.Promise<boolean>,
        parentEnabled = true,
    ): Promise<ToolbarItemState> {
        if (this.client) {
            const isOn = await state(this.client);
            const canEnable = (await enabled(this.client)) && parentEnabled;
            return new ToolbarItemState({
                enabled: canEnable,
                detail: new Int64(0),
                on: isOn,
                str: "",
                visible: true,
            });
        }
        return new ToolbarItemState({
            enabled: false,
            detail: new Int64(0),
            on: false,
            str: "",
            visible: true,
        });
    }

    public toggleOn(_tree: PropertyTreeItem) {
        this.traceOn = !this.traceOn;
        return this.withClient<boolean>(c => {
            return c.service.
                setEnabled(this.traceOn).
                then(() => Q.resolve(true));
        }, false);
    }
    public canToggleOn() {
        return this.stateAndEnabled(
            c => {
                return c.service.isEnabled().then(isOn => {
                    this.traceOn = isOn;
                    return isOn;
                });
            },
            c => {
                return c.service.canEnable();
            },
        );
    }

    public clear() {
        return this.withClient<boolean>(c => {
            return c.service.clear().then(() => Q.resolve(true));
        }, false);
    }

    public toggleSource(_tree: PropertyTreeItem) {
        this.mixedModeOn = !this.mixedModeOn;
        return this.withClient<boolean>(c => {
            return c.service.
                setMixedMode(this.mixedModeOn).
                then(() => Q.resolve(true));
        }, false);
    }

    public canToggleSource() {
        return this.stateAndEnabled(
            c => {
                return c.service.isMixedMode().then(isOn => {
                    this.mixedModeOn = isOn;
                    return isOn;
                });
            },
            c => {
                return c.service.canUseMixedMode();
            },
            this.traceOn,
        );
    }

    public toggleBrowse(_tree: PropertyTreeItem) {
        this.browseModeOn = !this.browseModeOn;
        return this.withClient<boolean>(c => {
            return c.service.
                setBrowseMode(this.browseModeOn).
                then(() => Q.resolve(true));
        }, false);
    }

    public canToggleBrowse() {
        return this.stateAndEnabled(
            c => {
                return c.service.isBrowsing().then(isOn => {
                    this.browseModeOn = isOn;
                    return isOn;
                });
            },
            c => {
                return c.service.canBrowse();
            },
            this.traceOn,
        );
    }

    public save() {
        return Q.resolve(true).then(() => {
            return vscode.window.showSaveDialog().then(
                path => {
                    if (path !== undefined && this.client) {
                        return this.client.service.
                            save(path.fsPath).
                            then(() => Q.resolve(true));
                    }
                    return Q.resolve(false);
                },
                () => {
                    return Q.resolve(false);
                },
            );
        });
    }

    public find() {
        vscode.window.showInputBox({});
    }

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve(this.def);
    }
}