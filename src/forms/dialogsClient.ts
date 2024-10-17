/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import * as Dialogs from "iar-vsc-common/thrift/bindings/DialogService";
import * as Q from "q";
import { DIALOG_SERVICE } from "iar-vsc-common/thrift/bindings/dialogs_types";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ToolbarItemState } from "iar-vsc-common/thrift/bindings/listwindow_types";
import { ToolbarItem } from "../../webviews/shared/rendering/toolbar/toolbarConstants";
import { LegacyUtils } from "../listwindows/clients/legacyUtils";

/**
 * Abstract baseclass used as the primary entrypoint for the form-view.
 */
export abstract class FormViewBackend {
    abstract setValue(
        id: string,
        tree: PropertyTreeItem,
    ): Q.Promise<boolean>;

    abstract updateState(
        id: string,
    ): Q.Promise<ToolbarItemState>;
}

/**
 *  Generic form view handler, which communicates using the
 *  dialog service.
 */
export class GenericFormViewBackend extends FormViewBackend {
    public static async Create(
        registry: ThriftServiceRegistry,
    ): Promise<GenericFormViewBackend> {
        const client = await registry.findService(DIALOG_SERVICE, Dialogs);
        return new GenericFormViewBackend(client);
    }

    private constructor(
        private readonly dialogClient: ThriftClient<Dialogs.Client>,
    ) {
        super();
    }

    override setValue(id: string, tree: PropertyTreeItem): Q.Promise<boolean> {
        return this.dialogClient.service.SetValue(id, tree);
    }

    override updateState(id: string): Q.Promise<ToolbarItemState> {
        return this.dialogClient.service.GetState(id);
    }
}


// Helper interface for defining items to generate when running
// in legacy mode.
export interface LegacyFormItems extends ToolbarItem {
    enabled: boolean;
    checked: boolean;
    value: string;
    update: (item: LegacyFormItems, value: PropertyTreeItem) => boolean;
}

export namespace Callbacks {
    export function checkCallback(
        item: LegacyFormItems,
        tree: PropertyTreeItem,
    ): boolean {
        const checked = LegacyUtils.GetStr0ValueAsBool(tree);
        if (checked !== undefined) {
            item.checked = checked;
        }
        return true;
    }
    export function valueCallback(
        item: LegacyFormItems,
        tree: PropertyTreeItem,
    ): boolean {
        const value = LegacyUtils.GetStr0Value(tree);
        if (value !== undefined) {
            item.value = value;
        }
        return true;
    }
}

/**
 * A legacy form backend, able to generate a form from a description
 * and handles the get/set and update sequence.
 */
export class LegacyFormViewBackend extends FormViewBackend {
    override setValue(id: string, tree: PropertyTreeItem): Q.Promise<boolean> {
        const match = this.items.find(item => {
            return item.id === id;
        });
        if (match && match.update(match, tree)) {
            // Ask for the callback to update the
            // state of all items.
            this.updateAll(this);
        }
        return Q.resolve(false);
    }

    public updateEnabled(ids: string[], enabled: boolean) {
        for (const id of ids) {
            const item = this.items.find(i => {
                return i.id === id;
            });
            if (item) {
                item.enabled = enabled;
            }
        }
    }

    public getItem(id: string) {
        return this.items.find(i => {
            return i.id === id;
        });
    }

    override updateState(id: string): Q.Promise<ToolbarItemState> {
        const state = new ToolbarItemState();
        state.visible = true; // Keep all items visible.
        for (const item of this.items) {
            if (item.id === id) {
                state.enabled = item.enabled;
                state.on = item.checked;
                state.str = item.value;
            }
        }
        return Q.resolve(state);
    }

    constructor(
        public items: LegacyFormItems[],
        private readonly updateAll: (keeper: LegacyFormViewBackend) => void,
    ) {
        super();
    }
}
