/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Q from "q";
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { Int64, TClientConstructor } from "thrift";
import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import { ToolbarItemState } from "iar-vsc-common/thrift/bindings/listwindow_types";
import { Serializable } from "../../../webviews/listwindow/protocol";
import { ToolbarItem, Tags } from "../../../webviews/listwindow/rendering/toolbar/toolbarConstants";
import { unpackTree } from "../../utils";


/**
 * The interaction methods which are exposed from the controller to the
 * actual backend.
 */
export abstract class ToolbarInterface {
    /** Get the full abstract definition of a toolbar */
    public abstract getToolbarDefinition(): Q.Promise<PropertyTreeItem>;
    /** Interact wit ha toolbar item. The tree consists of two children
     *  - int0 which for a value != 0 will treat the set command as final,
     *  - str0 which is the string value.
    */
    public abstract setToolbarItemValue(
        id: string,
        tree: PropertyTreeItem,
    ): Q.Promise<boolean>;
    /** Get the current state of an toolbar item */
    public abstract getToolbarItemState(
        id: string,
    ): Q.Promise<ToolbarItemState>;
    /** The tooltip to show when hovering a toolbar item. */
    public abstract getToolbarItemTooltip(id: string): Q.Promise<string>;
}

/**
 * This abstract class lies between the listwindowbackend and the registry.
 * It handles legacy EW:s and allows the backend to connect to the correct
 * version of the thrift service based on the ew-versioning.
 */
export abstract class AbstractListwindowClient<
    T extends ListWindowBackend.Client,
> extends ToolbarInterface {
    protected client: ThriftClient<T> | undefined = undefined;

    // Implement in subclasses to allow to connect to
    // whatever subclass to the ListWindowBackend.Client.
    public abstract connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>>;

    // Perform the actual connect call to the registry and deliver
    // a Client.
    protected async doConnect(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
        client: TClientConstructor<T>,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        // Connect to the backend to allow for calls to cspyserver
        this.client = await serviceRegistry.findService(serviceName, client);
        return this.client;
    }

    protected withClient<U>(
        callback: (c: ThriftClient<T>) => Q.Promise<U>,
        def: U,
    ): Q.Promise<U> {
        if (this.client) {
            return callback(this.client);
        }
        return Q.resolve(def);
    }
}

/**
 * The GenericToolbarProxy can be used by workbenches supporting the listwindow toolbar
 * interfaces. It simply redirects the calls to the backend directly, allowing for the
 * full support for toolbars.
 */
export class GenericListwindowClient extends AbstractListwindowClient<ListWindowBackend.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(
            serviceName,
            serviceRegistry,
            ListWindowBackend.Client,
        );
    }

    public getToolbarDefinition(): Q.Promise<PropertyTreeItem> {
        if (this.client) {
            return this.client.service.getToolbarDefinition();
        }
        return Q.resolve(new PropertyTreeItem());
    }

    public setToolbarItemValue(
        id: string,
        tree: PropertyTreeItem,
    ): Q.Promise<boolean> {
        if (this.client) {
            return this.client.service.setToolbarItemValue(id, tree);
        }
        return Q.resolve(false);
    }
    public getToolbarItemState(id: string): Q.Promise<ToolbarItemState> {
        if (this.client) {
            return this.client.service.getToolbarItemState(id);
        }
        return Q.resolve(new ToolbarItemState());
    }
    public getToolbarItemTooltip(id: string): Q.Promise<string> {
        return this.withClient(c => {
            return c.service.getToolbarItemTooltip(id);
        }, "");
    }
}

// Helper interface for defining items to generate when running
// in legacy mode.
export interface LegacyToolbarItem extends ToolbarItem {
    tooltip?: string;
    callback?: (tree: PropertyTreeItem) => Q.Promise<boolean>;
    state?: () => Promise<ToolbarItemState>;
}

/**
 *  The LegacyListwindowClient allows a workbench without the support
 *  for toolbars to mimic the behavior of a newer workbench.
 *  The subclass supplies:
 *  # The listwindow-client to connect to
 *  # A description of the LegacyToolbarItem which are used to generate
 *    the visible toolbar for the user.
 *
 *  The description of a LegacyToolbarItem carries a callback which
 *  should handle a user interacting with the item and the state-call,
 *  which should generate the current ToolbarItemState for the item.
 */
export abstract class LegacyListwindowClient<
    T extends ListWindowBackend.Client,
> extends AbstractListwindowClient<T> {
    protected toolbarItems: LegacyToolbarItem[] = [];
    constructor() {
        super();
    }

    // Pack the given description into something that
    // looks like the content from the new workbench.
    packDescription(
        toolbarItems: LegacyToolbarItem[],
    ): Serializable<PropertyTreeItem> {
        this.toolbarItems = toolbarItems;

        const root: Serializable<PropertyTreeItem> = {
            key: "ROOT",
            value: "NONE",
            children: [],
        };

        toolbarItems.forEach((item, index) => {
            const it: Serializable<PropertyTreeItem> = {
                key: Tags.kKeyIndexBase + index.toString(),
                value: "NONE",
                children: [],
            };
            it.children.push({
                key: Tags.kKeyItemId,
                value: item.id,
                children: [],
            });
            it.children.push({
                key: Tags.kKeyItemKind,
                value: item.type,
                children: [],
            });
            it.children.push({
                key: Tags.kKeyItemStr,
                value: item.text,
                children: [],
            });
            it.children.push({
                key: Tags.kKeyItemStr2,
                value: item.text2,
                children: [],
            });

            if (item.stringList.length > 0) {
                const stringList: Serializable<PropertyTreeItem> = {
                    key: Tags.kKeyItemStringList,
                    value: "NONE",
                    children: [],
                };
                item.stringList.forEach((val, index) => {
                    stringList.children.push({
                        key: index.toString(),
                        value: val,
                        children: [],
                    });
                });
                it.children.push(stringList);
            }
            root.children.push(it);
        });

        return root;
    }

    public getToolbarItemTooltip(id: string): Q.Promise<string> {
        const item = this.toolbarItems.find(item => {
            return item.id === id;
        });
        return Q.resolve(item === undefined ? "" : item.tooltip);
    }

    // Entrypoint for the interface.
    public getToolbarDefinition(): Q.Promise<PropertyTreeItem> {
        return this.getDescription().then(tree => {
            return Q.resolve(unpackTree(this.packDescription(tree)));
        });
    }

    // Implemented by subclasses to provide the description for
    // toolbar.
    abstract getDescription(): Q.Promise<LegacyToolbarItem[]>;

    public setToolbarItemValue(
        id: string,
        tree: PropertyTreeItem,
    ): Q.Promise<boolean> {
        const item = this.toolbarItems.find(item => {
            return item.id === id;
        });
        if (item !== undefined && item.callback !== undefined) {
            return item.callback(tree);
        }
        return Q.resolve(false);
    }

    public getToolbarItemState(id: string): Q.Promise<ToolbarItemState> {
        const item = this.toolbarItems.find(item => {
            return item.id === id;
        });
        if (item !== undefined && item.state !== undefined) {
            return Q.resolve(item.state());
        }
        return Q.resolve(
            new ToolbarItemState({
                enabled: true,
                visible: true,
                detail: new Int64(0),
                on: true,
                str: "",
            }),
        );
    }
}

// Class that is used for listwindows without any toolbars when running in legacy mode.
export class NullClient extends LegacyListwindowClient<ListWindowBackend.Client> {
    public connectToBackend(
        serviceName: string,
        serviceRegistry: ThriftServiceRegistry,
    ): Promise<ThriftClient<ListWindowBackend.Client>> {
        return this.doConnect(
            serviceName,
            serviceRegistry,
            ListWindowBackend.Client,
        );
    }

    getDescription(): Q.Promise<LegacyToolbarItem[]> {
        return Q.resolve([]);
    }
}

