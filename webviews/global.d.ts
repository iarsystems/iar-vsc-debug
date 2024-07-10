/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Get the VS Code webview API typings globally (e.g. acquireVsCodeApi)
import "vscode-webview";

declare module 'csstype' {
    interface PropertiesHyphen {
      // Allow CSS variables
      [index: `--${string}`]: any;
      "border-top-style"?: Property.BorderTopStyle | `var(${string})`;
      "border-right-style"?: Property.BorderRightStyle | `var(${string})`;
      "border-bottom-style"?: Property.BorderBottomStyle | `var(${string})`;
      "border-left-style"?: Property.BorderLeftStyle | `var(${string})`;
      "text-align"?: Property.TextAlign | `${Property.TextAlign} !important`;
    }
  }