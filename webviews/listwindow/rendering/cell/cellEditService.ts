/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { TextField } from "@vscode/webview-ui-toolkit";
import { createCustomEvent } from "../../events";
import { customElement } from "../utils";
import { CellEditRequestedEvent, CellPosition } from "./cell";

interface ActiveCellEdit {
    textField: TextFieldElement;
    origin: CellEditRequestedEvent;
}

export class CellEditService {
    onCellEditSubmitted: ((position: CellPosition, value: string) => void) | undefined
        = undefined;

    private pendingEdit: CellEditRequestedEvent | undefined = undefined;
    private activeCellEdit: ActiveCellEdit | undefined = undefined;

    setPendingCellInput(event: CellEditRequestedEvent) {
        this.pendingEdit = event;
    }

    setEditableStringForPendingEdit(text: string, position: CellPosition) {
        if (
            position.col !== this.pendingEdit?.detail.col ||
            position.row !== this.pendingEdit?.detail.row
        ) {
            return;
        }
        this.cancelCellInput();


        const textField = new TextFieldElement;
        textField.defaultValue = text;

        const rect = this.pendingEdit.detail.cellBounds;
        textField.width = rect.width;
        textField.height = rect.height;
        textField.style.position = "absolute";
        textField.style.left = rect.left + "px";
        textField.style.top = rect.top + "px";
        textField.style.width = rect.width + "px";
        textField.style.height = rect.height + "px";

        document.body.appendChild(textField);

        textField.addEventListener("canceled", () =>
            this.cancelCellInput(),
        );
        textField.addEventListener("cell-edit-submitted", ev => {
            if (this.activeCellEdit) {
                this.onCellEditSubmitted?.(this.activeCellEdit.origin.detail, ev.detail);
            }
            this.cancelCellInput();
        });

        this.activeCellEdit = {
            textField,
            origin: this.pendingEdit,
        };
        this.pendingEdit = undefined;
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

        input.onblur = () => this.onCancel();
        input.onkeydown = ev => {
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