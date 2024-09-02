/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export namespace Tags {
    export const kKeyIndexBase = "ITEM";
    export const kKeyItemKind = "KIND";
    export const kKeyItemStr = "TEXT";
    export const kKeyItemStr2 = "TEXT2";
    export const kKeyItemId = "ID";
    export const kKeyItemStringList = "STRINGLIST";
    export const kKeyItemBool = "BOOL";
    export const kValSpacingLess = "LESS";
    export const kValSpacingMore = "MORE";
    export const kValProgressSmall = "SMALL";
    export const kValProgressMedium = "MEDIUM";
    export const kValProgressLarge = "LARGE";
}

export enum ToolbarItemType {
    kKindUnknown = "UNKNOWN",
    kKindTextButton = "TEXTBUTTON",
    kKindIconButton = "ICONBUTTON",
    kKindTextCheck = "TEXTCHECK",
    kKindIconCheck = "ICONCHECK",
    kKindEditText = "EDITTEXT",
    kKindEditTextDyn = "EDITTEXTDYN",
    kKindDisplayText = "DISPLAYTEXT",
    kKindDisplayTextDyn = "DISPLAYTEXTDYN",
    kKindTextMenu = "TEXTMENU",
    kKindIconMenu = "ICONMENU",
    kKindSelectMenu = "SELECTMENU",
    kKindSelectMenuDyn = "SELECTMENUDYN",
    kKindProgressBar = "PROGRESSBAR",
    kKindProgressBarDyn = "PROGRESSBARDYN",
    kKindSpacing = "SPACING",
    kKindStackProgressBar = "STACKPROGRESSBAR",
    kKindStackProgressBarDyn = "STACKPROGRESSBARDYN",
    kKindCommandButton = "COMMANDBUTTON",
    kKindSeparator = "SEPARATOR",
}


export interface TreeData {
    key: string;
    value: string;
    children: TreeData[];
}

export interface ToolbarItem {
    itemKey: string;
    id: string;
    type: ToolbarItemType;
    text: string;
    text2: string;
    bool: boolean;
    stringList: string[];
}
