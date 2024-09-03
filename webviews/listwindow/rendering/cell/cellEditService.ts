/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { TextField } from "@vscode/webview-ui-toolkit";
import { createCustomEvent } from "../../events";
import { customElement, toNumber } from "../utils";
import {  CellElement, CellPosition } from "./cell";
import { MessageService } from "../../messageService";
import { EditInfo } from "../../thrift/listwindow_types";
import { Serializable } from "../../protocol";

interface ActiveCellEdit {
    textField: TextFieldElement;
}

/**
 * Allows editing cell contents by opening a text field above the cell, e.g.
 * when clicking on it.
 */
export class CellEditService {
    private activeCellEdit: ActiveCellEdit | undefined = undefined;

    constructor(private readonly messageService: MessageService) {
        this.messageService.addMessageHandler(msg => {
            if (msg.subject === "editableStringReply") {
                this.setEditableStringForPendingEdit(msg.info, {
                    col: msg.col,
                    row: msg.row,
                });
            }
        });
    }

    /**
     * Requests that a text field is opened for the given cell. Specifying the
     * column -1 lets the backend choose which column in the given row should
     * be edited.
     */
    requestCellEdit(position: CellPosition) {
        this.messageService.sendMessage({
            subject: "getEditableString",
            col: position.col,
            row: position.row,
        });
    }

    private setEditableStringForPendingEdit(
        info: Serializable<EditInfo>,
        position: CellPosition,
    ) {
        if (position.col < 0 || position.row < 0) {
            return;
        }
        const cellElem = CellElement.lookupCell(position);
        if (!cellElem) {
            return;
        }

        this.cancelCellInput();

        const textField = new TextFieldElement();
        textField.defaultValue = info.editString;
        textField.selection = [
            toNumber(info.range.first),
            toNumber(info.range.last),
        ];

        const rect = cellElem.getBoundingClientRect();

        textField.style.position = "absolute";
        // The cell bounds are in client (i.e. "viewport") coordinates, but we
        // want them in page coordinates.
        textField.style.left = rect.left + window.scrollX + "px";
        textField.style.top = rect.top + window.scrollY + "px";
        textField.style.width = rect.width + "px";
        textField.style.height = rect.height + "px";
        textField.width = rect.width;
        textField.height = rect.height;

        document.body.appendChild(textField);

        textField.addEventListener("canceled", () => this.cancelCellInput());
        textField.addEventListener("cell-edit-submitted", ev => {
            if (this.activeCellEdit) {
                this.messageService.sendMessage({
                    subject: "cellEdited",
                    col: position.col,
                    row: position.row,
                    newValue: ev.detail,
                });
            }
            this.cancelCellInput();
        });

        this.activeCellEdit = {
            textField,
        };
    }

    private cancelCellInput() {
        if (this.activeCellEdit) {
            document.body.removeChild(this.activeCellEdit.textField);
            this.activeCellEdit = undefined;
        }
    }
}

@customElement("listwindow-text-field")
class TextFieldElement extends HTMLElement {
    defaultValue = "";
    selection: [number, number] | undefined = undefined;
    width: number | undefined = undefined;
    height: number | undefined = undefined;

    private isDone = false;

    connectedCallback() {
        // These are special variables used by vscode-text-field to set its size
        if (this.width) {
            this.style.setProperty("--input-min-width", String(this.width));
        }
        if (this.height) {
            this.style.setProperty("--input-height", String(this.height));
        }

        const input = document.createElement("vscode-text-field") as TextField;
        input.autofocus = true;
        input.value = this.defaultValue;
        // The vscode-text-field doesn't seem to create its children immediately,
        // so wait for the next frame to set the selection.
        requestAnimationFrame(() => {
            if (this.selection) {
                const inputElem = input.shadowRoot?.querySelector("input");
                inputElem?.setSelectionRange(this.selection[0], this.selection[1]);
            }
        });

        input.onblur = () => this.onCancel();
        input.onkeydown = ev => {
            // Don't allow this to trigger our global key handler
            ev.stopPropagation();
            if (ev.key === "Escape") {
                this.onCancel();
            } else if (ev.key === "Enter") {
                this.isDone = true;
                this.dispatchEvent(
                    createCustomEvent("cell-edit-submitted", {
                        detail: input.value,
                    }),
                );
            }
        };
        this.appendChild(input);
    }

    private onCancel() {
        // The 'blur' event fires when an element is removed, which means we'll
        // end up here twice (once for the initial blur or esc press, and once
        // again when the element is removed).
        if (!this.isDone) {
            this.isDone = true;
            this.dispatchEvent(new CustomEvent("canceled"));
        }
    }
}