/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * An object that can be or needs to disposed of,
 * in order to release some resource(s) held by it.
 *
 * Similar to vscode's Disposable, but redeclared here to avoid
 * having DAP code depend on vscode interfaces.
 */
export interface Disposable {
	dispose(): void | Promise<void>;
}