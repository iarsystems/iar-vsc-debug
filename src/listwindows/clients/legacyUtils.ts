/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { PropertyTreeItem } from "iar-vsc-common/thrift/bindings/shared_types";
import { Serializable } from "../../../webviews/shared/protocol";
import {
    Tags,
    ToolbarItem,
} from "../../../webviews/shared/rendering/toolbar/toolbarConstants";

export namespace LegacyUtils {
    export function GetStr0Value(tree: PropertyTreeItem): string | undefined {
        if (tree.key === "str0") {
            return tree.value;
        }
        for (const child of tree.children) {
            const val = GetStr0Value(child);
            if (val) {
                return val;
            }
        }
        return undefined;
    }

    export function GetStr0ValueAsBool(
        tree: PropertyTreeItem,
    ): boolean | undefined {
        const val = GetStr0Value(tree);
        if (!val) {
            return undefined;
        }
        return val === Tags.kValTrue;
    }

    export function CollectStr0Value(
        id: string,
        defaultValue: string,
        tree: PropertyTreeItem,
    ): string {
        const item = FindItemSubtree(id, tree);
        if (item) {
            return GetStr0Value(item) ?? defaultValue;
        }
        return defaultValue;
    }

    export function CollectBoolValue(
        id: string,
        defaultValue: boolean,
        tree: PropertyTreeItem,
    ): boolean {
        const item = FindItemSubtree(id, tree);
        if (item) {
            return GetStr0ValueAsBool(item) ?? defaultValue;
        }
        return defaultValue;
    }

    // Collect a subtree with the given id from a
    // larger tree.
    export function FindItemSubtree(
        id: string,
        tree: PropertyTreeItem,
    ): PropertyTreeItem | undefined {
        if (tree.key === Tags.kKeyItemId) {
            return tree.value === id ? tree : undefined;
        }
        for (const child of tree.children) {
            const subtree = FindItemSubtree(id, child);
            if (subtree) {
                return subtree;
            }
        }
        return undefined;
    }

    // Pack the given description into something that
    // looks like the content from the new workbench.
    export function packDescription<T extends ToolbarItem>(
        toolbarItems: T[],
    ): Serializable<PropertyTreeItem> {
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
}
