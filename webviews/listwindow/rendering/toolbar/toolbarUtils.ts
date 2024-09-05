/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import { TreeData } from "./toolbarConstants";
import { create } from "xmlbuilder2";
import { XMLParser } from "fast-xml-parser";

export namespace PropertyTreeConstants {
    export const kKeyKey = "key";
    export const kKeyTree = "tree";
    export const kKeyValue = "value";
    export const kChildren = "children";
    export const kValueNone = "NONE";
    export const kValueRoot = "ROOT";
}

function packTreeNode(node: TreeData, xmlParent: XMLBuilder): void {
    let xmlRoot = xmlParent.ele(PropertyTreeConstants.kKeyTree);
    xmlRoot.
        ele(PropertyTreeConstants.kKeyKey).
        txt(node.key);
    xmlRoot.
        ele(PropertyTreeConstants.kKeyValue).
        txt(node.value);
    xmlRoot = xmlRoot.ele(PropertyTreeConstants.kChildren);
    node.children.forEach((data: TreeData) => {
        packTreeNode(data, xmlRoot);
    });
}


// Unpack a json property tree into a TreeData structure.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unpackTree(tree: string | any): TreeData {
    if (typeof tree === "string") {
        const parser = new XMLParser();
        tree = parser.parse(tree).tree;
    }

    // Create a small tree entry with the
    // basic data. Each tree entry lists a key, a value and
    // a subtree which may contain more information.
    const entry: TreeData = {
        children: [],
        key: String(tree.key),
        value: String(tree.value),
    };
    if (tree.children instanceof Object) {
        if (tree.children.tree instanceof Array) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tree.children.tree.forEach((element: any) => {
                // Recurse through the property tree and concat new
                // TreeData as we go.
                entry.children = entry.children.concat(unpackTree(element));
            });
        } else {
            entry.children = entry.children.concat(
                unpackTree(tree.children.tree),
            );
        }
    }
    return entry;
}

// Convert a TreeData structure to a propertytree based xml structure.
export function packTree(root: TreeData, addRootNode = true): string {
    const xmlRoot = create();
    if (addRootNode) {
        root = {
            key: PropertyTreeConstants.kValueRoot,
            value: PropertyTreeConstants.kValueNone,
            children: [root],
        };
    }
    // Start handling the root object
    packTreeNode(root, xmlRoot);
    return xmlRoot.end({headless: true });
}

// Create an image entry using images from the extension.
export function addLocalImage(
    doc: Document,
    imagePath: string,
): HTMLImageElement | undefined {
    // The special vscode image directory is stored as the "imageroot" entry in
    // the html structure for the listwindow.
    const element = doc.getElementById("imageroot");
    let imageRoot = "";
    if (element !== undefined) {
        const root = element?.getAttribute("root");
        if (root !== null && root !== undefined) {
            imageRoot = root;
        }
    } else {
        console.error("Failed to load \"imageroot\"");
        return undefined;
    }

    // Found everything that we need => create the image block.
    const image = doc.createElement("img");
    image.src = `${imageRoot}/toolbar/${imagePath}`;
    return image;
}

export const VsCodeIconMap = new Map<string, string>([
    ["IDI_DBU_CODE_BP_MARK", "circle-filled"],
    ["IDI_DBU_CODE_BP_MARK_DISABLED", "circle"],
    ["IDI_DBU_TRACE_BP_MARK", "debug-breakpoint-conditional"],
    [
        "IDI_DBU_TRACE_BP_MARK_DISABLED",
        "debug-breakpoint-conditional-unverified",
    ],
    ["IDI_CODE_BP", "circle-filled"],
    ["IDI_DATA_BP", "debug-breakpoint-conditional"],
    ["IDI_DBU_TRACE_FILTER_BP_MARK", "circle-filled"],
    ["IDI_DBU_TRACE_FILTER_BP_MARK_DISABLED", "circle"],
    ["IDI_DBU_TRACE_TRIGGER_BP_MARK", "circle-filled"],
    ["IDI_DBU_TRACE_TRIGGER_BP_MARK_DISABLED", "circle"],
    ["IDI_DBU_PROF_CLOCK", "play-circle"],
    ["IDI_DBU_PROF_RESET", "redo"],
    ["IDI_DBU_PROF_GRAPH", "graph-line"],
    ["IDI_DBU_PROF_PROPERTIES", "settings-gear"],
    ["IDI_DBU_PROF_REFRESHNOW", "refresh"],
    ["IDI_DBU_PROF_AUTOREFRESH", "issue-reopened"],
    ["IDI_DBU_PROF_SAVE", "save"],
    ["IDI_DBU_PROF_SNAP", "arrow-both"],
    ["IDI_DBU_TRACE_ONOFF", "play-circle"],
    ["IDI_DBU_TRACE_CLEAR", "clear-all"],
    ["IDI_DBU_TRACE_MIXEDMODE", "diff-single"],
    ["IDI_DBU_TRACE_BROWSE", "editor-layout"],
    ["IDI_DBU_TRACE_FIND", "search"],
    ["IDI_DBU_TRACE_SETTINGS", "settings"],
    ["IDI_DBU_TRACE_COLUMNS", "split-horizontal"],
    ["IDI_DBU_TRACE_VIEW", "server-process"],
    ["IDI_DBU_FIND_IN_TRACE", "search"],
    ["IDI_TRACE_DISABLED", "plug"],
    ["IDI_TRACE_ENABLED", "debug-disconnect"],
    ["IDI_DBU_TRACE_BOOKMARK", "bookmark"],
    ["IDI_DBU_TRACE_CALL", "chevron-right"],
    ["IDI_DBU_TRACE_RETURN", "chevron-left"],
    ["IDI_DBU_TRACE_INTERRUPT", "triangle-right"],
    ["IDI_DBU_TRACE_FOUND", "arrow-right"],
    ["IDI_DBU_TRACE_EXEC_PT", "debug-breakpoint-log"],
    ["IDI_DBU_TRACE_DISCONT", "stop-circle"],
    ["IDI_MORE", "add"],
]);
