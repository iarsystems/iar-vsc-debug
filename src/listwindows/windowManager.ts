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
import * as ListWindowBackend from "iar-vsc-common/thrift/bindings/ListWindowBackend";
import { AbstractListwindowClient, NullClient } from "./clients/listwindowBackendClient";
import { QuickWatchClient } from "./clients/quickwatchLegacyClient";
import { TraceClient } from "./clients/traceLegacyClient";
import { RegisterClient } from "./clients/registersLegacyClient";
import { SymbolicMemoryClient } from "./clients/symbolicMemoryLegacyClient";
import { StackClient } from "./clients/stackLegacyClient";
import { CSpyLaunchRequestArguments } from "../dap/cspyDebug";


/** Describes a supported listwindow */
interface ViewDefinition {
    // The vscode view id to attach to
    viewId: string;
    // The cspyserver service name
    serviceName: string;
    // The fallback class for toolbars
    fallback?: new () => AbstractListwindowClient<ListWindowBackend.Client>;
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
    // prettier-ignore
    private static readonly VIEW_DEFINITIONS: ViewDefinition[] = [
        { viewId: "iar-autos", serviceName: "WIN_AUTO" },
        { viewId: "iar-trace", serviceName: "WIN_SLIDING_TRACE_WINDOW", fallback: TraceClient },
        { viewId: "iar-quick-watch", serviceName: "WIN_QUICK_WATCH", fallback: QuickWatchClient },
        { viewId: "iar-live-watch", serviceName: "WIN_STATIC_WATCH" },
        { viewId: "iar-reg-2", serviceName: "WIN_REGISTER_2", fallback: RegisterClient },
        { viewId: "iar-symbolic-memory", serviceName: "WIN_SYMBOLIC_MEMORY", fallback: SymbolicMemoryClient },
        { viewId: "iar-stack-1", serviceName: "WIN_STACK_1", fallback: StackClient },
    ];

    getBackendHandler(
        serviceName: string,
    ): ListWindowBackendHandler<ListWindowBackend.Client> | undefined {
        return this.windows.find(client => {
            return client.serviceName === serviceName;
        });
    }

    private readonly windows: ListWindowBackendHandler<ListWindowBackend.Client>[];
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
    private async connectToSession(session: vscode.DebugSession, supportsGenericToolbars: boolean) {
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
                await window.connect(session.id, registry, supportsGenericToolbars);
            } catch {
                // This is normal, since not all listwindows are supported by
                // all drivers
            }
        }
    }

    constructor(context: vscode.ExtensionContext) {
        this.windows = ListwindowManager.VIEW_DEFINITIONS.map(definition => {
            const view = new ListwindowViewProvider(
                context.extensionUri,
                definition.viewId,
            );
            return new ListWindowBackendHandler(
                view,
                definition.serviceName,
                definition.fallback ?? NullClient,
            );
        });

        vscode.debug.registerDebugConfigurationProvider("cspy", {
            resolveDebugConfiguration(_folder, debugConfiguration: vscode.DebugConfiguration & Partial<CSpyLaunchRequestArguments>) {
                // This tells the debug adapter that we can respond to listwindow requests.
                debugConfiguration.enableListWindowLookup ??= true;
                return debugConfiguration;
            },
        }, vscode.DebugConfigurationProviderTriggerKind.Initial);

        // Called during the start-up phase of a debug session. This allows
        // the listwindows to perform a complete update before the core
        // is started.
        context.subscriptions.push(
            vscode.debug.onDidReceiveDebugSessionCustomEvent(async ev => {
                if (ev.event === CustomEvent.Names.LISTWINDOWS_REQUESTED) {
                    await this.connectToSession(ev.session, ev.body.supportsToolbars);
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
