/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Get the VS Code webview API typings globally (e.g. acquireVsCodeApi)
import "vscode-webview";

declare module 'csstype' {
    interface PropertiesFallback {
      borderTopStyle?: StandardPropertiesFallback["borderTopStyle"] | `var(${string})`;
      borderRightStyle?: StandardPropertiesFallback["borderRightStyle"] | `var(${string})`;
      borderBottomStyle?: StandardPropertiesFallback["borderBottomStyle"] | `var(${string})`;
      borderLeftStyle?: StandardPropertiesFallback["borderLeftStyle"] | `var(${string})`;
    }
  }