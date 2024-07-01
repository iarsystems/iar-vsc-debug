/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * State that is persisted between view restarts and VS Code restarts.
 * Must be JSON-serializable. See:
 * https://code.visualstudio.com/api/extension-guides/webview#persistence
 */
export interface PersistedState {
    columnWidths?: number[];
}
