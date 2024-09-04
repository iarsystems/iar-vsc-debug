/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { ListwindowViewProvider } from "./listwindowViewProvider";
import { CustomRequest } from "../dap/customRequest";
import { ThriftServiceRegistry } from "iar-vsc-common/thrift/thriftServiceRegistry";
import { ServiceLocation } from "iar-vsc-common/thrift/bindings/ServiceRegistry_types";
import { ListWindowBackendHandler} from "./listwindowBackend";


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
    ];

    private readonly windows: ListWindowBackendHandler[];
    private readonly sessions: Map<vscode.DebugSession, ThriftServiceRegistry> =
        new Map();

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

        context.subscriptions.push(
            vscode.debug.onDidTerminateDebugSession(session => {
                if (session.type !== "cspy") {
                    return;
                }
                const registry = this.sessions.get(session);
                if (registry) {
                    for (const window of this.windows) {
                        window.disconnect();
                    }
                }
                this.sessions.delete(session);
            }),
        );

        context.subscriptions.push(
            vscode.debug.onDidChangeActiveDebugSession(async session => {
                if (session === undefined || session.type !== "cspy") {
                    return;
                }

                if (!this.sessions.has(session)) {
                    const location: CustomRequest.RegistryLocationResponse =
                        await session.customRequest(
                            CustomRequest.Names.GET_REGISTRY_LOCATION,
                        );
                    const registry = new ThriftServiceRegistry(
                        new ServiceLocation(location),
                    );
                    this.sessions.set(session, registry);
                }
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const registry = this.sessions.get(session)!;

                for (const window of this.windows) {
                    await window.connect(registry);
                }
            }),
        );
    }
}
