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
import { FormViewProvider } from "../forms/formViewProvider";
import { CodeCoverageClient } from "./clients/codeCoverageLegacyClient";


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
        { viewId: "iar-find-in-trace", serviceName: "WIN_FIND_IN_SLIDING_TRACE"},
        { viewId: "iar-code-coverage", serviceName: "WIN_CODECOVERAGE", fallback: CodeCoverageClient },
        { viewId: "iar-profiling", serviceName: "WIN_PROFILING2" },
    ];

    getBackendHandler(
        serviceName: string,
    ): ListWindowBackendHandler<ListWindowBackend.Client> | undefined {
        return this.windows.find(client => {
            return client.serviceName === serviceName;
        });
    }

    public getViewId(serviceName: string): string | undefined {
        return ListwindowManager.VIEW_DEFINITIONS.find(val => {
            return val.serviceName === serviceName;
        })?.viewId;
    }

    private readonly windows: ListWindowBackendHandler<ListWindowBackend.Client>[];
    private readonly sessions: Map<string, ThriftServiceRegistry> = new Map();
    private activeSession: string | undefined = undefined;
    // This is set when a session is in progress of connecting to its listwindows.
    private connectingTask: Promise<unknown> | undefined = undefined;
    public formView: FormViewProvider;

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

        // It's normal for 'connect' to fail, since not all windows are
        // supported by all drivers.
        await Promise.allSettled(
            this.windows.map(window =>
                window.connect(session.id, registry, supportsGenericToolbars),
            ),
        );
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

        this.formView = new FormViewProvider(context);

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
                    const connectingTask = Promise.allSettled([
                        this.connectingTask,
                        this.connectToSession(
                            ev.session,
                            ev.body.supportsToolbars,
                        ),
                    ]);
                    connectingTask.finally(() => {
                        if (this.connectingTask === connectingTask) {
                            this.connectingTask = undefined;
                        }
                    });
                    this.connectingTask = connectingTask;

                    await connectingTask;
                    await ev.session.customRequest(
                        CustomRequest.Names.LISTWINDOWS_RESOLVED,
                    );
                } else if (ev.event === CustomEvent.Names.SHOW_VIEW_REQUEST) {
                    // Translate the backend name into the vs-code id.
                    const id = ListwindowManager.VIEW_DEFINITIONS.find(val => {
                        return val.serviceName === ev.body.viewId;
                    })?.viewId;
                    if (id) {
                        await vscode.commands.executeCommand(`${id}.focus`);
                    }
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
            vscode.debug.onDidChangeActiveDebugSession(async(session) => {
                // Wait until all listwindow connections have been established,
                // sometimes we end up here before the session has been fully
                // launched.
                while (this.connectingTask) {
                    await this.connectingTask;
                }
                this.setActiveSession(session?.id);
            }),
        );
    }
}
