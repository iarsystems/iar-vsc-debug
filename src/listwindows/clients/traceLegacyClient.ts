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
import {
    ToolbarItemState,
    TraceFindParams,
} from "iar-vsc-common/thrift/bindings/listwindow_types";
import { Int64 } from "thrift";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import * as Q from "q";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import * as Trace from "iar-vsc-common/thrift/bindings/TraceListWindowBackend";
import * as vscode from "vscode";
import {
    Callbacks,
    LegacyFormItems,
    LegacyFormViewBackend,
} from "../../forms/dialogsClient";
import { listwindowManager } from "../../extension";
import { LegacyUtils } from "./legacyUtils";
import { unpackTree } from "../../utils";
import { GenericDialogReturnType } from "iar-vsc-common/thrift/bindings/frontend_types";

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
            callback: _tree => {
                return this.find();
            },
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
        return Q.Promise<boolean>(async resolve => {
            const path = await vscode.window.showSaveDialog();
            if (path !== undefined && this.client) {
                this.client.service.save(path.fsPath);
                resolve(true);
            }
            resolve(false);
        });
    }

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve(this.def);
    }

    // Find form
    private readonly kTextSearch = "i1";
    private readonly kSearchFor = "i2";
    private readonly kMatchCase = "i3";
    private readonly kMatchWholeWord = "i4";
    private readonly kSearchOnlyOneColumn = "i5";
    private readonly kColumn = "i6";
    private readonly kUseAddressRange = "i7";
    private readonly kAddressStart = "i8";
    private readonly kAddressEnd = "i9";

    private readonly findFormDef: LegacyFormItems[] = [
        {
            id: this.kTextSearch,
            type: ToolbarItemType.kKindTextCheck,
            text: "Search text",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: true,
            value: "",
            update: Callbacks.checkCallback,
        },
        {
            id: this.kSearchFor,
            type: ToolbarItemType.kKindEditText,
            text: "",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: false,
            value: "",
            update: Callbacks.valueCallback,
        },
        {
            id: this.kMatchCase,
            type: ToolbarItemType.kKindTextCheck,
            text: "Match case",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: true,
            value: "",
            update: Callbacks.checkCallback,
        },
        {
            id: this.kMatchWholeWord,
            type: ToolbarItemType.kKindTextCheck,
            text: "Match whole word",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: true,
            value: "",
            update: Callbacks.checkCallback,
        },
        {
            id: this.kSearchOnlyOneColumn,
            type: ToolbarItemType.kKindTextCheck,
            text: "Only search in one column",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: true,
            value: "",
            update: Callbacks.checkCallback,
        },
        {
            id: this.kColumn,
            type: ToolbarItemType.kKindSelectMenu,
            text: "",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: false,
            value: "",
            update: Callbacks.valueCallback,
        },
        {
            id: this.kUseAddressRange,
            type: ToolbarItemType.kKindTextCheck,
            text: "Address range",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: true,
            value: "",
            update: Callbacks.checkCallback,
        },
        {
            id: this.kAddressStart,
            type: ToolbarItemType.kKindEditText,
            text: "Start",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: false,
            value: "",
            update: Callbacks.valueCallback,
        },
        {
            id: this.kAddressEnd,
            type: ToolbarItemType.kKindEditText,
            text: "End",
            bool: true,
            itemKey: "",
            stringList: [],
            text2: "",
            checked: false,
            enabled: false,
            value: "",
            update: Callbacks.valueCallback,
        },
    ];

    public find(): Q.Promise<boolean> {
        return Q.Promise<boolean>(async resolve => {
            const traceSearchParams = new TraceFindParams();
            if (
                this.client &&
                listwindowManager &&
                listwindowManager.formView
            ) {
                const columns = await this.client.service.getColumnInfo();
                const dropDown = this.findFormDef.find(i => {
                    return i.id === this.kColumn;
                });
                if (dropDown) {
                    dropDown.stringList = columns.map(c => {
                        return c.title;
                    });
                }

                const backend = new LegacyFormViewBackend(
                    this.findFormDef,
                    keeper => {
                        const textSearchEnabled = keeper.getItem(
                            this.kTextSearch,
                        )?.checked as boolean;
                        const rangeSearchEnabled = keeper.getItem(
                            this.kUseAddressRange,
                        )?.checked as boolean;
                        const onlyOneCol = keeper.getItem(
                            this.kSearchOnlyOneColumn,
                        )?.checked as boolean;

                        keeper.updateEnabled(
                            [this.kTextSearch],
                            !rangeSearchEnabled,
                        );
                        keeper.updateEnabled(
                            [
                                this.kSearchFor,
                                this.kMatchCase,
                                this.kMatchWholeWord,
                                this.kSearchOnlyOneColumn,
                            ],
                            textSearchEnabled && !rangeSearchEnabled,
                        );
                        keeper.updateEnabled(
                            [this.kColumn],
                            textSearchEnabled &&
                                !rangeSearchEnabled &&
                                onlyOneCol,
                        );
                        keeper.updateEnabled(
                            [this.kAddressStart, this.kAddressEnd],
                            rangeSearchEnabled,
                        );
                    },
                );
                const form = await listwindowManager.formView.createForm(
                    "findInTrace",
                    "Find in trace",
                    unpackTree(LegacyUtils.packDescription(this.findFormDef)),
                    backend,
                );
                const res = await form.showForm();
                if (res.type !== GenericDialogReturnType.kOk) {
                    resolve(false);
                }

                traceSearchParams.textSearch = LegacyUtils.CollectBoolValue(
                    this.kSearchFor,
                    false,
                    res.items,
                );
                traceSearchParams.findWhat = LegacyUtils.CollectStr0Value(
                    this.kSearchFor,
                    "",
                    res.items,
                );
                traceSearchParams.matchCase = LegacyUtils.CollectBoolValue(
                    this.kMatchCase,
                    false,
                    res.items,
                );
                traceSearchParams.matchWord = LegacyUtils.CollectBoolValue(
                    this.kMatchWholeWord,
                    false,
                    res.items,
                );
                traceSearchParams.useRange = LegacyUtils.CollectBoolValue(
                    this.kUseAddressRange,
                    false,
                    res.items,
                );

                if (
                    LegacyUtils.CollectBoolValue(
                        this.kSearchOnlyOneColumn,
                        false,
                        res.items,
                    )
                ) {
                    traceSearchParams.columnName = LegacyUtils.CollectStr0Value(
                        this.kColumn,
                        "",
                        res.items,
                    );
                    traceSearchParams.searchColumn = columns.findIndex(c => {
                        return c.title === traceSearchParams.columnName;
                    });
                } else {
                    traceSearchParams.searchColumn = -1;
                }
                traceSearchParams.rangeStart = new Int64(
                    LegacyUtils.CollectStr0Value(
                        this.kAddressStart,
                        "0",
                        res.items,
                    ),
                );
                traceSearchParams.rangeEnd = new Int64(
                    LegacyUtils.CollectStr0Value(
                        this.kAddressEnd,
                        "0",
                        res.items,
                    ),
                );

                await this.client.service.find(traceSearchParams);
            }
            resolve(true);
        });
    }
}
