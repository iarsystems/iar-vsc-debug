/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as vscode from "vscode";
import { CustomEvent, CustomRequest } from "../dap/customRequest";
import * as Color from "color";
import { CSpyLaunchRequestArguments } from "../dap/cspyDebug";

// A mapping of css variables to their values
type CssVars = Record<string, string>;

/**
 * Responds to {@link CustomEvent.Names.THEME_REQUESTED} requests from the debug
 * adapter with the colors of the current VS Code theme, so that CSpyServer knows
 * which colors to use for listwindow formats.
 *
 * Note that there is no API for getting theme colors from VS Code
 * (https://github.com/microsoft/vscode/issues/32813); as a workaround, we spawn
 * a short-lived webview which grabs the values of all CSS variables, and then
 * convert the values we need to RGB values.
 */
export class ThemeProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    private static readonly VIEW_ID = "iar-theme-detector";

    private view?: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];

    // We cache the theme variables so we don't have to spawn the webview for
    // every new session.
    private cssVars: Promise<CssVars> | undefined = undefined;
    private onCssVarsResolved: ((vars: CssVars) => void) | undefined =
        undefined;

    constructor() {
        vscode.commands.executeCommand(
            "setContext",
            "iar-debug.showThemeDetector",
            false,
        );
        this.disposables.push(
            vscode.window.registerWebviewViewProvider(
                ThemeProvider.VIEW_ID,
                this,
            ),
        );
        this.disposables.push(
            vscode.window.onDidChangeActiveColorTheme(() => {
                this.cssVars = undefined;
            }),
        );
        this.disposables.push(
            vscode.debug.onDidReceiveDebugSessionCustomEvent(async ev => {
                if (ev.event === CustomEvent.Names.THEME_REQUESTED) {
                    const vars = await this.getCssVars();

                    const body: CustomRequest.ThemeResolvedArgs = {
                        id: ev.body.id,
                        theme: {
                            bg: Colors.cssToRgb(
                                vars,
                                "--vscode-sideBar-background",
                            ) ?? Colors.BLACK,
                            fg: Colors.cssToRgb(
                                vars,
                                "--vscode-sideBar-foreground",
                                "--vscode-foreground",
                            ) ?? Colors.WHITE,
                            disabledFg: Colors.cssToRgb(
                                vars,
                                "--vscode-disabledForeground",
                            ) ?? Colors.WHITE,
                            highlightedFg: Colors.cssToRgb(
                                vars,
                                "--vscode-list-highlightForeground",
                            ) ?? Colors.WHITE,
                            pc: Colors.cssToRgb(
                                vars,
                                "--vscode-debugIcon-breakpointCurrentStackframeForeground",
                            ) ?? Colors.RED,
                        },
                    };

                    ev.session.customRequest(
                        CustomRequest.Names.THEME_RESOLVED,
                        body,
                    );
                }
            }),
        );
        this.disposables.push(vscode.debug.registerDebugConfigurationProvider("cspy", {
            resolveDebugConfiguration(_folder, debugConfiguration: vscode.DebugConfiguration & Partial<CSpyLaunchRequestArguments>) {
                // This tells the debug adapter that we can respond to theme requests
                debugConfiguration.enableThemeLookup ??= true;
                return debugConfiguration;
            },
        }, vscode.DebugConfigurationProviderTriggerKind.Initial));
    }

    private async getCssVars(): Promise<CssVars> {
        if (this.cssVars === undefined) {
            this.cssVars = new Promise<CssVars>(resolve => {
                this.onCssVarsResolved = vars => {
                    resolve(vars);
                    vscode.commands.executeCommand(
                        "setContext",
                        "iar-debug.showThemeDetector",
                        false,
                    );
                };

            });
            await vscode.commands.executeCommand(
                "setContext",
                "iar-debug.showThemeDetector",
                true,
            );
            await vscode.commands.executeCommand(`${ThemeProvider.VIEW_ID}.focus`);
        }

        return this.cssVars;
    }

    // Called by vscode before the view is shown
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken,
    ): void | Thenable<void> {
        this.view = webviewView;
        this.view.onDidDispose(() => {
            this.view = undefined;
        });

        this.view.webview.options = {
            enableScripts: true,
        };

        this.view.webview.onDidReceiveMessage((message: CssVars) => {
            this.onCssVarsResolved?.(message);
        });
        this.view.webview.html = Rendering.getWebviewContent(this.view.webview);
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

/**
 * Generates the HTML for the view.
 */
namespace Rendering {
    export function getWebviewContent(webview: vscode.Webview) {
        const nonce = getNonce();

        // install the es6-string-html extension for syntax highlighting here
        return /*html*/ `<!DOCTYPE html>
    <html lang="en" style="height: 100%">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                    font-src ${webview.cspSource};
                    img-src ${webview.cspSource};
                    frame-src ${webview.cspSource};
                    script-src 'nonce-${nonce}';
                    style-src ${webview.cspSource} 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script nonce=${nonce}>
            const map = {};
            Object.values(document.getElementsByTagName("html")[0].style).forEach(
                key =>
                    map[key] = document.getElementsByTagName("html")[0].style.getPropertyValue(key)
            );
            const vscode = acquireVsCodeApi();
            vscode.postMessage(map);
        </script>
    </head>
    <body>
    </body>
    </html>`;
    }
}

function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

namespace Colors {
    export const BLACK: CustomRequest.ThemeColor = { r: 0, b: 0, g: 0 };
    export const WHITE: CustomRequest.ThemeColor = { r: 255, b: 255, g: 255 };
    export const RED: CustomRequest.ThemeColor = { r: 255, b: 0, g: 0 };

    /**
     * Tries each of the 'varNames' and returns the first existing and valid
     * value as an rgb color.
     */
    export function cssToRgb(
        vars: CssVars,
        ...varNames: string[]
    ): CustomRequest.ThemeColor | undefined {
        for (const varName of varNames) {
            const value = vars[varName];
            if (value) {
                const varMatch = /var\((.*)\)/.exec(value);
                if (varMatch && varMatch[1]) {
                    const rgb = cssToRgb(vars, varMatch[1]);
                    if (rgb) {
                        return rgb;
                    }
                } else {
                    try {
                        const color = Color(value).rgb();
                        let red   = color.red();
                        let green = color.green();
                        let blue  = color.blue();
                        if (color.alpha() !== 1) {
                            // CSpyServer doesn't support colors with alpha, so
                            // as a workaround we dim transparent colors a bit.
                            red   *= color.alpha();
                            green *= color.alpha();
                            blue  *= color.alpha();
                        }
                        return {
                            r: red,
                            g: green,
                            b: blue,
                        };
                    } catch {
                        // Not a valid color string, keep going
                    }
                }
            }
        }
        return undefined;
    }
}