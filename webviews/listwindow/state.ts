/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { WebviewApi } from "vscode-webview";

/**
 * State that is persisted between view restarts and VS Code restarts.
 * Properties are automatically persisted when set.
 * Must be JSON-serializable. See:
 * https://code.visualstudio.com/api/extension-guides/webview#persistence
 */
export class PersistedState {
    private readonly data: PersistedState.Data;

    constructor(private readonly vscode: WebviewApi<PersistedState.Data>) {
        this.data = vscode.getState() ?? {};
    }

    get columnWidths(): number[] | undefined {
        return this.data.columnWidths;
    }
    set columnWidths(val: number[] | undefined) {
        this.data.columnWidths = val;
        this.save();
    }

    private save() {
        this.vscode.setState(this.data);
    }
}

export namespace PersistedState {
    // The actual persisted object
    export interface Data {
        columnWidths?: number[];
    }
}

