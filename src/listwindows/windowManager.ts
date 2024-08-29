/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { CustomRequest } from "../dap/customRequest";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { logger } from "iar-vsc-common/logger";

/**
 * Placeholder for the real listwindow proxy
 */
class ListwindowProxy {
    static connect(
        _registry: ThriftServiceRegistry,
        _serviceName: string,
    ): Promise<ListwindowProxy> {
        return Promise.resolve(new ListwindowProxy());
    }

    constructor() {
        /* */
    }

    /**
     * Uses the given view to render to, and begins handling messages (e.g user
     * interaction) from it.
     */
    attachToView(_view: ListwindowViewProvider): void {
        /* */
    }

    /**
     * Forgets about any currently attached view.
     */
    detachFromView(): void {
        /* */
    }
}

type ViewId = string;

/**
 * Sets up the listwindow webviews, and sets up listwindow backend
 * connections ("proxies") whenever a debug session launches.
 * When there are multiple debug sessions running at once, this class also acts
 * as a "multiplexer", controlling which of the backends is allowed to render to
 * the listwindow webviews.
 */
export class ListwindowManager {
    // Each entry is a supported listwindow, consisting of a vscode view id and
    // a cspyserver service name
    private static readonly VIEW_DEFINITIONS: Array<[ViewId, string]> = [
        ["iar-live-watch", "WIN_STATIC_WATCH"],
    ];

    private readonly views: Map<ViewId, ListwindowViewProvider>;
    private readonly sessions: Map<
        vscode.DebugSession,
        Map<ViewId, ListwindowProxy>
    > = new Map();
    // The proxies which are currently using the webviews
    private attachedProxies: ListwindowProxy[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.views = new Map(
            ListwindowManager.VIEW_DEFINITIONS.map(([viewId, _]) => [
                viewId,
                new ListwindowViewProvider(context.extensionUri, viewId),
            ]),
        );

        context.subscriptions.push(
            vscode.debug.onDidStartDebugSession(session => {
                if (session.type !== "cspy") {
                    return;
                }
                this.setupProxies(session);
            }),
        );

        context.subscriptions.push(
            vscode.debug.onDidTerminateDebugSession(session => {
                if (session.type !== "cspy") {
                    return;
                }
                this.sessions.delete(session);
            }),
        );

        context.subscriptions.push(
            vscode.debug.onDidChangeActiveDebugSession(async session => {
                this.attachedProxies.forEach(proxy => proxy.detachFromView());
                this.attachedProxies = [];

                if (session === undefined || session.type !== "cspy") {
                    return;
                }

                // Sometimes, onDidChangeActiveDebugSession is called before
                // onDidStartDebugSession, in that case we need to connect here
                await this.setupProxies(session);
                const proxies = this.sessions.get(session);
                if (!proxies) {
                    return;
                }

                for (const [viewId, view] of this.views) {
                    const proxy = proxies.get(viewId);
                    if (proxy) {
                        proxy.attachToView(view);
                        this.attachedProxies.push(proxy);
                    }
                }
            }),
        );
    }

    private async setupProxies(session: vscode.DebugSession) {
        if (this.sessions.has(session)) {
            return;
        }
        this.sessions.set(session, new Map());

        const location: CustomRequest.RegistryLocationResponse =
            await session.customRequest(
                CustomRequest.Names.GET_REGISTRY_LOCATION,
            );
        const registry = new ThriftServiceRegistry(
            new ServiceLocation(location),
        );

        const proxies = new Map();
        for (const [viewId, serviceName] of ListwindowManager.VIEW_DEFINITIONS) {
            try {
                const proxy = await ListwindowProxy.connect(registry, serviceName);
                proxies.set(viewId, proxy);
            } catch (e) {
                logger.warn(
                    `Failed to connect to listwindow backend '${serviceName}': ${e}`,
                );
            }
        }
        this.sessions.set(session, proxies);
    }
}