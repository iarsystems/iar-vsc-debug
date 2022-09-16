/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Standalone script for running the debug adapter --- used for testing
 */
import { DebugSession } from "@vscode/debugadapter";
import { CSpyDebugSession } from "./cspyDebug";

DebugSession.run(CSpyDebugSession);
