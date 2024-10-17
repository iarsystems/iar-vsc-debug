/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { WebviewApi } from "vscode-webview";
import {
    ExtensionMessage,
    Serializable,
} from "../shared/protocol";
import { PersistedState } from "../listwindow/state";
import { MessageService } from "../shared/messageService";
import { css } from "@emotion/css";
import { PropertyTreeItem } from "../shared/thrift/shared_types";
import { FormCanvas } from "./formHelpers";
import {
    provideVSCodeDesignSystem,
    vsCodeCheckbox,
    vsCodeTextField,
    vsCodeButton,
    vsCodeDropdown,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(
    vsCodeTextField(),
    vsCodeCheckbox(),
    vsCodeButton(),
    vsCodeDropdown(),
);

/**
 * Class able to render and control a request for a form form the user.
 */
class FormViewController {
    private readonly messageService: MessageService;
    private readonly formElement: HTMLElement | undefined = undefined;
    private formContent: FormCanvas | undefined = undefined;

    constructor(element: HTMLElement, vscode: WebviewApi<PersistedState.Data>) {
        this.formElement = element;
        this.formElement.classList.add(Styles.formStyle);

        // Force the document to span the entire height.
        document.body.classList.add(css({ height: "100%" }));

        // Initialize services
        this.messageService = new MessageService(vscode);
        this.messageService.addMessageHandler(msg => this.handleMessage(msg));
        this.messageService.sendMessage({ subject: "loaded" });
    }

    /** Handle a message from the view provider in the extension code */
    private handleMessage(msg: ExtensionMessage) {
        if (msg.subject === "renderToolbar") {
            console.log(`Rendering form: ${msg.params}`);
            this.renderForm(msg.id?? "", msg.params);
        }
    }

    private renderForm(title: string, form: Serializable<PropertyTreeItem>) {
        if (!this.formElement) {
            return;
        }

        this.formContent = new FormCanvas(
            this.messageService,
            title,
            form,
            () => {
                this.closeForm(false);
            },
            () => {
                this.closeForm(true);
            },
        );
        this.formElement.replaceChildren(this.formContent);

        const ids: string[] = this.formContent.elements
            ? this.formContent.elements.getItemIds()
            : [];
        this.messageService.sendMessage({
            subject: "toolbarRendered",
            ids: ids,
        });
    }

    closeForm(isCanceled: boolean) {
        if (this.formContent) {
            let content: Serializable<PropertyTreeItem> = {
                key: "",
                value: "",
                children: [],
            };
            content =
                this.formContent.elements?.collectContent() as Serializable<PropertyTreeItem>;
            this.messageService.sendMessage({
                subject: "formClosed",
                isCanceled: isCanceled,
                form: content,
            });
            this.formContent = undefined;
        }
        // Clear all the children.
        this.formElement?.childNodes.forEach(c => {
            this.formElement?.removeChild(c);
        });
    }
}

window.addEventListener("load", () => {
    const formElement = document.getElementById("form");
    if (!formElement) {
        return;
    }
    const vscode = acquireVsCodeApi<PersistedState.Data>();

    new FormViewController(formElement, vscode);
});

namespace Styles {
    export const formStyle = css({
        padding: 0,
        maxWidth: "300px",
        height: "100%"
    });
}