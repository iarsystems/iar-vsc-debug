/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { css } from "@emotion/css";
import { Button } from "@vscode/webview-ui-toolkit/dist/button";
import { PropertyTreeItem } from "../shared/thrift/shared_types";
import { ToolbarElement } from "../shared/rendering/toolbar/toolbar";
import { Serializable } from "../shared/protocol";
import { customElement } from "../shared/utils";
import { MessageService } from "../shared/messageService";


/**
 *  The canvas containing the entire set of information for
 *  the submitted form.
 */
@customElement("form-canvas")
export class FormCanvas extends HTMLElement {
    public elements: ToolbarElement | undefined;

    constructor(
        private readonly messageService: MessageService,
        private readonly titleString: string,
        private readonly form: Serializable<PropertyTreeItem>,
        private readonly onOk: () => void,
        private readonly onCancel: () => void,
    ) {
        super();
        this.titleString = titleString;
        this.form = form;
    }

    connectedCallback() {
        const divElement = document.createElement("div");
        divElement.classList.add(Styles.Canvas);
        const formTitle = new FormTitleElement(this.titleString);
        divElement.appendChild(formTitle);
        this.elements = new ToolbarElement(this.form, this.messageService, true);

        this.elements.addEventListener("toolbar-item-interaction", ev => {
            this.messageService.sendMessage({
                subject: "toolbarItemInteraction",
                id: ev.detail.id,
                properties: ev.detail.properties,
            });
        });

        divElement.appendChild(this.elements);
        const formButtons = new FormButtonsElement(this.onOk, this.onCancel);
        divElement.appendChild(formButtons);
        this.appendChild(divElement);
    }
}

/**
 * A nice title
 */
@customElement("form-title")
export class FormTitleElement extends HTMLElement {
    private readonly titleString: string;

    constructor(title: string) {
        super();
        this.titleString = title;
    }

    connectedCallback() {
        const headerDiv = document.createElement("div");
        headerDiv.textContent = this.titleString;
        headerDiv.classList.add(Styles.Title);
        this.appendChild(headerDiv);
    }
}


/*
* Custom-buttons for ok and cancel.
*/
@customElement("form-buttons")
export class FormButtonsElement extends HTMLElement {

    constructor(
        private readonly onOk: () => void,
        private readonly onCancel: () => void,
    ) {
        super();
    }

    connectedCallback() {
        const buttongrid = document.createElement("div");
        buttongrid.classList.add(Styles.ButtonGrid);

        // Create an "OK" and "Cancel" button
        const okButton = document.createElement("vscode-button") as Button;
        okButton.classList.add(Styles.Button);
        okButton.textContent = "OK";
        okButton.onclick = () => {
            this.onOk();
        };

        const cancelButton = document.createElement("vscode-button") as Button;
        cancelButton.classList.add(Styles.Button);
        cancelButton.textContent = "Cancel";
        cancelButton.onclick = () => {
            this.onCancel();
        };

        buttongrid.appendChild(okButton);
        buttongrid.appendChild(cancelButton);
        this.appendChild(buttongrid);
    }
}

namespace Styles {
    export const Canvas = css({
        paddingLeft: "5px",
        paddingRight: "5px",
    });
    export const Button = css({
        height: "25px",
        width: "100px",
        marginRight: "10px",
    });
    export const ButtonGrid = css({
        height: "auto",
        width: "100%",
        display: "flex",
        flexWrap: "nowrap",
        justifyContent: "end",
        marginTop: "10px",
    });
    export const Title = css({
        height: "auto",
        marginLeft: "5px",
        marginRight: "5px",
        textTransform: "uppercase",
        paddingLeft: "10px",
        fontSize: "small",
        fontWeight: "bold",
        width: "100%",
        display: "block",
        borderBottom: "solid var(--vscode-sideBar-border) 2px",
    });
}