/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MsgIcon, MsgKind, MsgResult } from "iar-vsc-common/thrift/bindings/frontend_types";
import { BreakpointType } from "./breakpoints/cspyBreakpointService";

/**
 * Custom requests can be sent from a DAP client to the DAP server. Basically, these are C-SPY specific extensions to
 * the DAP protocol.
 */
export namespace CustomRequest {
    /**
     * Holds the names of all supported custom requests (i.e. the string values used to perform the requests).
     */
    export enum Names {
        USE_AUTO_BREAKPOINTS      = "useAutoBreakpoints",
        USE_HARDWARE_BREAKPOINTS  = "useHardwareBreakpoints",
        USE_SOFTWARE_BREAKPOINTS  = "useSoftwareBreakpoints",
        REGISTERS                 = "registers",
        GET_BREAKPOINT_TYPES      = "getBreakpointTypes",
        SET_LOCKSTEP_MODE_ENABLED = "setLockstepMode",

        /// Frontend service requests, used by {@link FrontendHandler}. Even though these are DAP "requests", they are
        /// actually responses to a previous DAP event that created a dialog (see below). The adapter sends an event telling
        /// the client to open a dialog (with an id), and the client then sends one of these "requests" back with the result
        /// of the dialog (and the same id).
        MESSAGE_BOX_CLOSED       = "messageBoxClosed",
        OPEN_DIALOG_CLOSED       = "openDialogClosed",
        SAVE_DIALOG_CLOSED       = "saveDialogClosed",
        PROGRESS_BAR_CANCELED    = "progressBarCanceled",
        ELEMENT_SELECTED         = "elementSelected",
        MULTIELEMENT_SELECTED    = "multiElementSelected",
    }

    /**
     * Response data to a {@link CustomRequest.REGISTERS} request.
     */
    export interface RegistersResponse {
        svdContent: string | undefined,
    }

    /**
     * Response data to a {@link CustomRequest.GET_BREAKPOINT_TYPES} request.
     */
    export type BreakpointTypesResponse = BreakpointType[];

    /**
     * Request arguments/parameters for a {@link CustomRequest.SET_LOCKSTEP_MODE_ENABLED} request.
     */
    export interface SetLockstepModeEnabledArgs {
        enabled: boolean;
    }
    export function isSetLockstepModeArgs(obj: unknown): obj is SetLockstepModeEnabledArgs {
        return typeof(obj) === "object" && typeof((obj as SetLockstepModeEnabledArgs).enabled) === "boolean";
    }

    /**
     * Request arguments/parameters for a {@link CustomRequest.MESSAGE_BOX_CLOSED} request.
     */
    export interface MessageBoxClosedArgs {
        id: number;
        result: MsgResult;
    }
    export function isMessageBoxClosedArgs(obj: unknown): obj is MessageBoxClosedArgs {
        if (typeof(obj) === "object") {
            const args = obj as MessageBoxClosedArgs;
            return args.id !== undefined && args.result !== undefined;
        }
        return false;
    }
    /**
     * Request arguments/parameters for a {@link CustomRequest.OPEN_DIALOG_CLOSED} request.
     */
    export interface OpenDialogClosedArgs {
        id: number;
        paths: string[];
    }
    export function isOpenDialogClosedArgs(obj: unknown): obj is OpenDialogClosedArgs {
        if (typeof(obj) === "object") {
            const args = obj as OpenDialogClosedArgs;
            return args.id !== undefined && args.paths !== undefined;
        }
        return false;
    }
    /**
     * Request arguments/parameters for a {@link CustomRequest.SAVE_DIALOG_CLOSED} request.
     */
    export interface SaveDialogClosedArgs {
        id: number;
        path: string | undefined;
    }
    export function isSaveDialogClosedArgs(obj: unknown): obj is SaveDialogClosedArgs {
        if (typeof(obj) === "object") {
            const args = obj as SaveDialogClosedArgs;
            return args.id !== undefined;
        }
        return false;
    }
    /**
     * Request arguments/parameters for a {@link CustomRequest.PROGRESS_BAR_CANCELED} request.
     */
    export interface ProgressBarCanceledArgs {
        id: number;
    }
    export function isProgressBarCanceledArgs(obj: unknown): obj is ProgressBarCanceledArgs {
        if (typeof(obj) === "object") {
            const args = obj as ProgressBarCanceledArgs;
            return args.id !== undefined;
        }
        return false;
    }
    /**
     * Request arguments/parameters for a {@link CustomRequest.ELEMENT_SELECTED} request.
     */
    export interface ElementSelectedArgs {
        id: number;
        selectedIndex: number;
    }
    export function isElementSelectedArgs(obj: unknown): obj is ElementSelectedArgs {
        if (typeof(obj) === "object") {
            const args = obj as ElementSelectedArgs;
            return args.id !== undefined && args.selectedIndex !== undefined;
        }
        return false;
    }
    /**
     * Request arguments/parameters for a {@link CustomRequest.MULTIELEMENT_SELECTED} request.
     */
    export interface MultiElementSelectedArgs {
        id: number;
        selectedIndices: number[];
    }
    export function isMultiElementSelectedArgs(obj: unknown): obj is MultiElementSelectedArgs {
        if (typeof(obj) === "object") {
            const args = obj as MultiElementSelectedArgs;
            return args.id !== undefined && args.selectedIndices !== undefined;
        }
        return false;
    }
}

/**
 * Custom events or "reverse requests" can be sent from the DAP server to a DAP client. Basically, these are C-SPY
 * specific extensions to the DAP protocol.
 */
export namespace CustomEvent {
    /**
     * Holds the names of all supported custom events or "reverse requests".
     */
    export enum Names {
        /// most events here correspond to events sent to {@link FrontendHandler}.
        MESSAGE_BOX_CREATED         = "messageBoxCreated",
        OPEN_DIALOG_CREATED         = "openDialogCreated",
        SAVE_DIALOG_CREATED         = "saveDialogCreated",
        PROGRESS_BAR_CREATED        = "progressBarCreated",
        PROGRESS_BAR_UPDATED        = "progressBarUpdated",
        PROGRESS_BAR_CLOSED         = "progressBarClosed",
        ELEMENT_SELECT_CREATED      = "elementSelectCreated",
        MULTIELEMENT_SELECT_CREATED = "multiElementSelectCreated",
        FILE_OPENED                 = "fileOpened",
    }

    export interface MessageBoxCreatedData {
        id: number;
        title: string;
        message: string;
        icon: MsgIcon;
        kind: MsgKind;
    }
    export interface OpenDialogCreatedData {
        id: number;
        title: string;
        startDir: string;
        type: "files" | "folder";
        // The filters are specified on the format used by windows forms, see:
        // https://docs.microsoft.com/en-us/dotnet/api/system.windows.forms.filedialog.filter?view=windowsdesktop-6.0#remarks
        filter: string;
        allowMultiple: boolean;
    }
    export interface SaveDialogCreatedData {
        id: number;
        title: string;
        startPath: string;
        // The filters are specified on the format used by windows forms, see:
        // https://docs.microsoft.com/en-us/dotnet/api/system.windows.forms.filedialog.filter?view=windowsdesktop-6.0#remarks
        filter: string;
    }
    export interface ProgressBarCreatedData {
        id: number;
        title: string;
        initialMessage: string;
        canCancel: boolean;
        /** The progress value representing 0% progress */
        minValue: number;
        /**
         * The size of the range of possible progress values. The progress values for this bar are expected to be
         * in the range [minvalue, minValue + valueRange], representing [0, 100] percent progress.
         */
        valueRange: number;
    }
    export interface ProgressBarUpdatedData {
        id: number;
        message?: string;
        /**
         * The current progress value. Used together with the minValue and valueRange the bar was created with to
         * calculate a progress percentage.
         */
        value?: number;
    }
    export interface ProgressBarClosedData {
        id: number;
    }
    export interface ElementSelectCreatedData {
        id: number;
        title: string;
        message: string;
        elements: string[];
    }
    export interface MultiElementSelectCreatedData {
        id: number;
        title: string;
        message: string;
        elements: string[];
    }
    export interface FileOpenedData {
        path: string;
        line: number,
        col: number,
    }
}