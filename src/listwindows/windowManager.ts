/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { CustomEvent, CustomRequest } from "../dap/customRequest";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { ListWindowBackendHandler } from "./listwindowBackend";

type ViewId = string;

/**
 * Sets up the listwindow webviews and manages the backend connections. This
 * class locates services registries (i.e. cspyserver instances) for new debug
 * sessions and, when there are multiple debug sessions, notifies the
 * listwindows which cspyserver instance to use.
 */
export class ListwindowManager {
    // Each entry is a supported listwindow, consisting of a vscode view id and
    // a cspyserver service name
    private static readonly VIEW_DEFINITIONS: Array<[ViewId, string]> = [
        ["iar-autos", "WIN_AUTO"],
        //["iar-quick-watch", "WIN_QUICK_WATCH"]
    ];

    private readonly windows: ListWindowBackendHandler[];
    private readonly sessions: Map<string, ThriftServiceRegistry> = new Map();
    private activeSession: string | undefined = undefined;

    // Connect all registered windows to the corresponding services using
    // the given registry.
    async connect(sessionId: string, registry: ThriftServiceRegistry) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, registry);
        }

        this.activeSession = sessionId;
        for (const window of this.windows) {
            await window.connect(registry);
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

        if (this.isActiveSession(session.id)) {
            // This is already the active session.
            return;
        }

        let registry: ThriftServiceRegistry | null = null;
        if (!this.sessions.has(session.id)) {
            const location: CustomRequest.RegistryLocationResponse =
                await session.customRequest(
                    CustomRequest.Names.GET_REGISTRY_LOCATION,
                );
            registry = new ThriftServiceRegistry(new ServiceLocation(location));
        } else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            registry = this.sessions.get(session.id)!;
        }

        if (registry) {
            await this.connect(session.id, registry);
        }
    }

    constructor(context: vscode.ExtensionContext) {
        this.windows = ListwindowManager.VIEW_DEFINITIONS.map(
            ([viewId, serviceName]) => {
                const view = new ListwindowViewProvider(
                    context.extensionUri,
                    viewId,
                );
                return new ListWindowBackendHandler(view, serviceName);
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
            vscode.debug.onDidTerminateDebugSession(session => {
                if (session.type !== "cspy") {
                    return;
                }

                if (this.isActiveSession(session.id)) {
                    // Only forget this one if it's the active session.
                    const registry = this.sessions.get(session.id);
                    if (registry) {
                        for (const window of this.windows) {
                            window.forgetBackend();
                        }
                    }
                }
                this.sessions.delete(session.id);
            }),
        );

        context.subscriptions.push(
            vscode.debug.onDidChangeActiveDebugSession(async session => {
                if (session !== undefined) {
                    await this.connectToSession(session);
                }
            }),
        );
    }
}
