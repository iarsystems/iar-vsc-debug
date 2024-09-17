/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { CustomEvent, CustomRequest } from "../dap/customRequest";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { ListWindowBackendHandler } from "./listwindowBackend";
import { logger } from "iar-vsc-common/logger";

/** Describes a supported listwindow */
interface ViewDefinition {
    // The vscode view id to attach to
    viewId: string;
    // The cspyserver service name
    serviceName: string;
}

/**
 * Sets up the listwindow webviews and manages the backend connections. This
 * class locates services registries (i.e. cspyserver instances) for new debug
 * sessions and, when there are multiple debug sessions, notifies the
 * listwindows which cspyserver instance to use.
 */
export class ListwindowManager {
    // Each entry is a supported listwindow, consisting of a vscode view id and
    // a cspyserver service name
    private static readonly VIEW_DEFINITIONS: ViewDefinition[] = [
        { viewId: "iar-autos", serviceName: "WIN_AUTO" },
        { viewId: "iar-trace", serviceName: "WIN_SLIDING_TRACE_WINDOW" },
        { viewId: "iar-quick-watch", serviceName: "WIN_QUICK_WATCH" },
        { viewId: "iar-reg-2", serviceName: "WIN_REGISTER_2" },
    ];

    private readonly windows: ListWindowBackendHandler[];
    private readonly sessions: Map<string, ThriftServiceRegistry> = new Map();
    private activeSession: string | undefined = undefined;

    setActiveSession(sessionId: string | undefined) {
        this.activeSession = sessionId;
        if (sessionId) {
            for (const window of this.windows) {
                try {
                    window.setActiveSession(sessionId);
                } catch {
                    // This is normal, since not all listwindows are supported by
                    // all drivers
                }
            }
        }
    }

    private isActiveSession(sessionId: string): boolean {
        if (
            this.activeSession !== undefined &&
            this.activeSession === sessionId
        ) {
            // This is already the active session.
            return true;
        }
        return false;
    }

    // From a given vscode debug session, connect a listwindows to
    // the registry assigned to the session. If the given session is
    // the active session, this call does nothing.
    private async connectToSession(session: vscode.DebugSession) {
        if (session.type !== "cspy") {
            return;
        }

        if (this.sessions.has(session.id)) {
            logger.warn("Tried connecting the same listwindow session twice");
            return;
        }

        const location: CustomRequest.RegistryLocationResponse =
            await session.customRequest(
                CustomRequest.Names.GET_REGISTRY_LOCATION,
            );
        const registry = new ThriftServiceRegistry(new ServiceLocation(location));

        for (const window of this.windows) {
            try {
                await window.connect(session.id, registry);
            } catch {
                // This is normal, since not all listwindows are supported by
                // all drivers
            }
        }
    }

    constructor(context: vscode.ExtensionContext) {
        this.windows = ListwindowManager.VIEW_DEFINITIONS.map(
            definition => {
                const view = new ListwindowViewProvider(
                    context.extensionUri,
                    definition.viewId,
                );
                return new ListWindowBackendHandler(view, definition.serviceName);
            },
        );

        // Called during the start-up phase of a debug session. This allows
        // the listwindows to perform a complete update before the core
        // is started.
        context.subscriptions.push(
            vscode.debug.onDidReceiveDebugSessionCustomEvent(async ev => {
                if (ev.event === CustomEvent.Names.LISTWINDOWS_REQUESTED) {
                    await this.connectToSession(ev.session);
                    await ev.session.customRequest(
                        CustomRequest.Names.LISTWINDOWS_RESOLVED,
                    );
                }
            }),
        );

        context.subscriptions.push(
            vscode.debug.onDidTerminateDebugSession(async(session) => {
                if (session.type !== "cspy") {
                    return;
                }
                if (this.isActiveSession(session.id)) {
                    this.setActiveSession(undefined);
                }

                for (const window of this.windows) {
                    await window.forgetSession(session.id);
                }
                const registry = this.sessions.get(session.id);
                registry?.dispose();
                this.sessions.delete(session.id);
            }),
        );

        context.subscriptions.push(
            vscode.debug.onDidChangeActiveDebugSession(session => {
                this.setActiveSession(session?.id);
            }),
        );
    }
}
