/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


import { css } from "@emotion/css";
import { Alignment } from "../../thrift/listwindow_types";

/**
 * Classes and styles that are shared across components.
 */
export namespace SharedStyles {
    /** An element over which a dragged element is being hovered */
    export const dropTarget = css({
        background: "var(--vscode-list-dropBackground) !important",
        color: "inherit !important",
    });

    /**
     * Get the css class corresponding to the given {@link Alignment}.
     */
    export function alignmentToStyle(alignment: Alignment): string {
        switch (alignment) {
            case Alignment.kLeft:
                return ALIGNMENT_LEFT;
            case Alignment.kRight:
                return ALIGNMENT_RIGHT;
            case Alignment.kCenter:
                return ALIGNMENT_CENTER;
        }
    }
    const ALIGNMENT_LEFT = css({
        textAlign: "left",
        justifySelf: "left",
    });
    const ALIGNMENT_RIGHT = css({
        textAlign: "right",
        justifySelf: "right",
    });
    const ALIGNMENT_CENTER = css({
        textAlign: "center",
        justifySelf: "center",
    });

    // "z-index" values used by various elements. By defining them in one place,
    // it's easier to get an overview of how the elements stack.
    export enum ZIndices {
        Toolbar = 2,
        Tooltip = 3,
        ContextMenu = 3,
    }
}
