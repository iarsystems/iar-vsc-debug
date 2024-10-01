/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { WebviewApi } from "vscode-webview";
import {
    ColumnResizeMode,
    ExtensionMessage,
    RenderParameters,
    Serializable,
} from "./protocol";
import { GridRenderer } from "./rendering/grid";
import { TooltipService } from "./rendering/tooltipService";
import { PersistedState } from "./state";
import { HoverService } from "./rendering/hoverService";
import { Theming } from "./rendering/styles/theming";
import {
    provideVSCodeDesignSystem,
    vsCodeCheckbox,
    vsCodeTextField,
    vsCodeButton,
    vsCodeDropdown,
} from "@vscode/webview-ui-toolkit";
import { DragDropService } from "./rendering/dragDropService";
import { MessageService } from "./messageService";
import { KeyboardInput } from "./keyboardInput";
import { css } from "@emotion/css";
import { ToolbarElement } from "./rendering/toolbar/toolbar";
import { toBigInt } from "./rendering/utils";
import { PropertyTreeItem } from "./thrift/shared_types";

provideVSCodeDesignSystem().register(
    vsCodeTextField(),
    vsCodeCheckbox(),
    vsCodeButton(),
    vsCodeDropdown(),
);

/**
 * The main class, which orchestrates rendering and is where we handle most
 * input events.
 */
class ListwindowController {
    private readonly persistedState: PersistedState;
    private renderParams: Serializable<RenderParameters> | undefined =
        undefined;
    private toolbarRenderParams: Serializable<PropertyTreeItem> | undefined =
        undefined;
    private resizeMode: ColumnResizeMode = "fixed";

    private readonly messageService: MessageService;
    private readonly hoverService = new HoverService();
    private readonly dragDropService: DragDropService;

    private readonly grid: GridRenderer;
    private readonly toolbarTooltipService: TooltipService;
    private toolbar: ToolbarElement | undefined = undefined;

    constructor(
        private readonly toolbarElement: HTMLElement | undefined,
        appElement: HTMLElement,
        vscode: WebviewApi<PersistedState.Data>,
    ) {
        // Set up some global styles
        document.documentElement.classList.add(css({
            overflow: "hidden",
        }));
        document.body.classList.add(css({
            padding: 0,
            // For some reason the webview iframe is sometimes one pixel narrower
            // than its container (rounding error?). This is to get around that.
            paddingRight: "1px",
            height: "100%",
            color: "var(--vscode-sideBar-foreground, var(--vscode-foreground))",
            scrollbarColor: "var(--vscode-scrollbarSlider-background) transparent",
            display: "grid",
            gridTemplateRows: "max-content 1fr",
            gridTemplateColumns: "100%",
        }));
        appElement.classList.add(css({
            padding: 0,
            overflow: "hidden",
        }));

        // Initialize services
        this.persistedState = new PersistedState(vscode);
        this.messageService = new MessageService(vscode);
        this.toolbarTooltipService = new TooltipService(
            document.body,
            this.messageService,
        );

        const viewId = appElement.getAttribute("viewId") ?? "unknown";
        this.dragDropService = new DragDropService(viewId, this.messageService);
        this.dragDropService.onFeedbackChanged = () => this.render();

        this.grid = new GridRenderer(appElement,
            this.hoverService,
            this.dragDropService,
            this.messageService,
        );

        Theming.initialize();
        Theming.setViewHasFocus(document.hasFocus());
        window.addEventListener("focus", () => Theming.setViewHasFocus(true));
        window.addEventListener("blur", () => Theming.setViewHasFocus(false));

        KeyboardInput.initialize(this.messageService);
        KeyboardInput.onCellEditRequested = () => {
            if (this.renderParams && this.renderParams.selection.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const sel = this.renderParams.selection[0]!;
                const start = toBigInt(sel.first);
                const end = toBigInt(sel.last);
                if (start === end) {
                    // We do not yet know which column to edit. Sending '-1'
                    // tells the backend to choose which column to edit.
                    this.grid.requestCellEdit({
                        col: -1,
                        row: start,
                    });
                }
            }
        };

        appElement.addEventListener("columns-resized", ev => {
            this.persistedState.columnWidths = ev.detail.newColumnWidths;
        });

        this.messageService.addMessageHandler(msg => this.handleMessage(msg));
        this.messageService.sendMessage({ subject: "loaded" });
    }

    /** Handle a message from the view provider in the extension code */
    private handleMessage(msg: ExtensionMessage) {
        switch (msg.subject) {
            case "updateToolbarItem": {
                //Handled by the items them-self
                break;
            }
            case "renderToolbar": {
                this.toolbarRenderParams = msg.params;
                this.renderToolbar();
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (this.toolbar) {
                    this.messageService.sendMessage({
                        subject: "toolbarRendered",
                        ids: this.toolbar.getItemIds(),
                    });
                }
                break;
            }
            case "render": {
                this.renderParams = msg.params;
                this.render();
                this.messageService.sendMessage({ subject: "rendered" });
                break;
            }
            case "setResizeMode":
                this.resizeMode = msg.mode;
                if (this.renderParams) {
                    this.render();
                }
                break;
            case "dumpHTML":
                this.messageService.sendMessage({
                    subject: "HTMLDump",
                    html: document.body.outerHTML,
                });
                break;
        }
    }


    private renderToolbar() {
        if (
            this.toolbarElement &&
            this.toolbarRenderParams &&
            this.toolbarRenderParams.children.length > 0
        ) {
            this.toolbar = new ToolbarElement(
                this.toolbarRenderParams,
                this.messageService,
            );
            this.toolbar.hoverService = this.hoverService;
            this.toolbarElement.replaceChildren(this.toolbar);
            this.toolbarElement.classList.add(Styles.toolbarCanvas);

            this.toolbar.addEventListener("toolbar-item-interaction", ev => {
                this.messageService.sendMessage({
                    subject: "toolbarItemInteraction",
                    id: ev.detail.id,
                    properties: ev.detail.properties,
                });
            });
            this.toolbar.addEventListener("toolbar-item-hovered", ev => {
                this.toolbarTooltipService.requestToolbarTooltip(ev);
            });
        }
    }

    private render() {
        if (!this.renderParams) {
            return;
        }
        Theming.setGridLinesVisible(!!this.renderParams?.listSpec.showGrid);

        this.grid.render(
            this.renderParams,
            this.resizeMode,
            this.persistedState.columnWidths,
        );

    }
}


window.addEventListener("load", () => {
    document.addEventListener("contextmenu", ev => {
        // Never allow VS Code to open its own context menu
        ev.preventDefault();
    });

    const appElement = document.getElementById("app");
    if (!appElement) {
        return;
    }
    const toolbarElement = document.getElementById("toolbar");
    if (!toolbarElement) {
        return;
    }
    const vscode = acquireVsCodeApi<PersistedState.Data>();

    new ListwindowController(toolbarElement, appElement, vscode);
});

namespace Styles {
    export const toolbarCanvas = css({
        width: "100%",
        backgroundColor: "var(--vscode-sideBar-background)",
    });
}
