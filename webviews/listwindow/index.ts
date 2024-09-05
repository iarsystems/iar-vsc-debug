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
import { GridElement } from "./rendering/grid";
import { TooltipService } from "./rendering/tooltipService";
import { PersistedState } from "./state";
import { SelectionFlags } from "./thrift/listwindow_types";
import { HoverService } from "./rendering/hoverService";
import { Theming } from "./rendering/styles/theming";
import {
    provideVSCodeDesignSystem,
    vsCodeCheckbox,
    vsCodeTextField,
    vsCodeButton,
    vsCodeDropdown,
} from "@vscode/webview-ui-toolkit";
import { CellEditService } from "./rendering/cell/cellEditService";
import { DragDropService } from "./rendering/dragDropService";
import { ContextMenuService } from "./rendering/contextMenuService";
import { MessageService } from "./messageService";
import { KeyboardInput } from "./keyboardInput";
import { css } from "@emotion/css";
import { ToolbarElement } from "./rendering/toolbar/toolbar";
import { toBigInt } from "./rendering/utils";
import { SharedStyles } from "./rendering/styles/sharedStyles";

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
    private static readonly NO_OVERFLOW_X = css({ overflowX: "hidden" });

    private readonly persistedState: PersistedState;
    private renderParams: Serializable<RenderParameters> | undefined =
        undefined;
    private toolbarRenderParams: string | undefined = undefined;
    private resizeMode: ColumnResizeMode = "fixed";

    private readonly messageService: MessageService;
    private readonly tooltipService: TooltipService;
    private readonly hoverService = new HoverService();
    private readonly contextMenuService;
    private readonly cellEditService: CellEditService;
    private readonly dragDropService: DragDropService;

    private grid: GridElement | undefined = undefined;
    private toolbar: ToolbarElement | undefined = undefined;

    constructor(
        private readonly appElement: HTMLElement,
        private readonly toolbarElement: HTMLElement | undefined,
        vscode: WebviewApi<PersistedState.Data>,
    ) {
        document.body.classList.add(css({
            padding: 0,
            // For some reason the webview iframe is sometimes one pixel narrower
            // than its container (rounding error?). This is to get around that.
            paddingRight: "1px",
            height: "100%",
            color: "var(--vscode-sideBar-foreground, var(--vscode-foreground))",
            scrollbarColor: "var(--vscode-scrollbarSlider-background) transparent",
        }));
        appElement.classList.add(css({
            padding: 0,
            height: "100%",
        }));

        this.persistedState = new PersistedState(vscode);
        this.messageService = new MessageService(vscode);
        this.tooltipService = new TooltipService(this.messageService);
        this.cellEditService = new CellEditService(this.messageService);
        this.contextMenuService = new ContextMenuService(
            this.appElement,
            this.messageService,
        );

        const viewId = appElement.getAttribute("viewId") ?? "unknown";
        this.dragDropService = new DragDropService(viewId, this.messageService);
        this.dragDropService.onFeedbackChanged = () => this.render();

        Theming.initialize();
        Theming.setViewHasFocus(document.hasFocus());
        window.addEventListener("focus", () => Theming.setViewHasFocus(true));
        window.addEventListener("blur", () => Theming.setViewHasFocus(false));

        KeyboardInput.initialize(this.messageService, () =>
            this.grid?.getRangeOfVisibleRows(),
        );
        KeyboardInput.onCellEditRequested = () => {
            if (this.renderParams && this.renderParams.selection.length === 1) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const sel = this.renderParams.selection[0]!;
                const start = toBigInt(sel.first);
                const end = toBigInt(sel.last);
                if (start === end) {
                    // We do not yet know which column to edit. Sending '-1'
                    // tells the backend to choose which column to edit.
                    this.cellEditService.requestCellEdit({
                        col: -1,
                        row: Number(start),
                    });
                }
            }
        };

        this.messageService.addMessageHandler(msg => this.handleMessage(msg));
        this.messageService.sendMessage({ subject: "loaded" });
    }

    /** Handle a message from the view provider in the extension code */
    private handleMessage(msg: ExtensionMessage) {
        switch (msg.subject) {
            case "renderToolbar": {
                this.toolbarRenderParams = msg.params;
                this.renderToolbar();
                this.messageService.sendMessage({ subject: "toolbarRendered" });
                break;
            }
            case "render": {
                this.renderParams = msg.params;
                this.render(msg.ensureRowVisible);
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
                    html: this.appElement.outerHTML,
                });
                break;
        }
    }

    private renderToolbar() {
        if (
            this.toolbarElement &&
            this.toolbarRenderParams &&
            this.toolbarRenderParams.length > 0
        ) {
            this.toolbar = new ToolbarElement(this.toolbarRenderParams);
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
                this.tooltipService.requestToolbarTooltip(ev);
            });

            // Re-position the position of the header to give
            // room for the toolbar.
            if (
                this.grid !== undefined &&
                this.grid.headerElement !== undefined
            ) {
                this.grid.headerElement.addToolbarArea();
            }
        }
    }

    private render(ensureRowVisible?: number) {
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Replace all contents of the appElement
        this.grid = new GridElement();
        this.grid.data = this.renderParams;
        this.grid.resizeMode = this.resizeMode;
        if (this.persistedState.columnWidths) {
            this.grid.initialColumnWidths = this.persistedState.columnWidths;
        }
        this.grid.hoverService = this.hoverService;
        this.grid.dragDropService = this.dragDropService;

        if (this.toolbar !== undefined && this.grid.headerElement) {
            this.grid.headerElement.addToolbarArea();
        }

        this.appElement.replaceChildren(this.grid);

        // Attach event listeners to the new elements
        this.grid.addEventListener("columns-resized", ev => {
            this.persistedState.columnWidths = ev.detail.newColumnWidths;
        });
        this.grid.addEventListener("column-clicked", ev => {
            this.messageService.sendMessage({
                subject: "columnClicked",
                col: ev.detail.col,
            });
        });

        this.grid.addEventListener("cell-clicked", ev => {
            if (ev.detail.isDoubleClick) {
                this.messageService.sendMessage({
                    subject: "cellDoubleClicked",
                    col: ev.detail.col,
                    row: ev.detail.row,
                });
            } else {
                let flags = SelectionFlags.kReplace;
                if (ev.detail.ctrlPressed) {
                    flags = SelectionFlags.kAdd;
                } else if (ev.detail.shiftPressed) {
                    flags = SelectionFlags.kRange;
                }
                this.messageService.sendMessage({
                    subject: "cellLeftClicked",
                    col: ev.detail.col,
                    row: ev.detail.row,
                    flags,
                });
            }
        });
        this.grid.addEventListener("cell-right-clicked", ev => {
            this.contextMenuService.requestContextMenu(ev);
        });
        this.grid.addEventListener("cell-hovered", ev => {
            this.tooltipService.requestTooltip(ev);
        });
        this.grid.addEventListener("row-expansion-toggled", ev => {
            this.messageService.sendMessage({
                subject: "rowExpansionToggled",
                row: ev.detail.row,
            });
        });
        this.grid.addEventListener("more-less-toggled", ev => {
            this.messageService.sendMessage({
                subject: "moreLessToggled",
                row: ev.detail.row,
            });
        });
        this.grid.addEventListener("checkbox-toggled", ev => {
            this.messageService.sendMessage({
                subject: "checkboxToggled",
                row: ev.detail.row,
            });
        });
        this.grid.addEventListener("cell-edit-requested", ev => {
            if (!this.renderParams?.frozen) {
                this.cellEditService.requestCellEdit(ev.detail);
            }
        });

        Theming.setGridLinesVisible(!!this.renderParams?.listSpec.showGrid);

        if (this.resizeMode === "fit") {
            document.documentElement.classList.add(ListwindowController.NO_OVERFLOW_X);
        } else {
            document.documentElement.classList.remove(ListwindowController.NO_OVERFLOW_X);
        }

        window.scrollTo(scrollX, scrollY);

        if (ensureRowVisible !== undefined) {
            this.grid.ensureRowVisible(ensureRowVisible);
        }
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

    new ListwindowController(appElement, toolbarElement, vscode);
});

namespace Styles {
    export const toolbarCanvas = css({
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: SharedStyles.ZIndices.Toolbar,
        backgroundColor: "var(--vscode-sideBar-background)",
    });
}
