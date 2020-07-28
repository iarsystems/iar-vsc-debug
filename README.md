# vscode-mock-debug

This is a VS Code extension based on `vscode-mock-debug`, an example project
from Microsoft for developing a Debug Adapter using the TypeScript SDK.
The extension provides a Debug Adapter that connects to a C-SPY instance via CSpyServer,
thus enabling some C-SPY debugging functionality in VS Code.

The Debug Adapter implementation can be found in `src/dap/cspyDebug.ts`.

Aside from the DA, the project also includes a VS Code extension that tells VS
Code how to start the DA.

I've tested the project for ARM using both a simulator and I-JET (on windows only).

To run the extension, open this folder in VS Code, and run `npm install` in the terminal.
Then, launch the `Extension + Server` configuration from the debugging panel.
In the new window, you may open an EW project folder, such as `ew-test-project` in this repository.
Then, open up `.vscode/launch.json` within the project folder and make sure
you have a valid C-SPY launch configuration.
The project may then be debugged by pressing `F5` or from the debugging panel.
In order for the default launch configuration to work, you should install the extension
`IAR for Visual Studio Code` from the marketplace.

## The CSpyRuby version

I previously implemented the Debug Adapter with CSpyRuby. That version can be found in commit
`0d19cae87ba9b9312a96d4f96d955c53cca6e994` and earlier. The CSpyRuby version has some extra
functionality that I haven't had the time to rewrite for CSpyServer, most notably the
disassembly and memory views.

The VS Code extension manages the custom debugging views.
The extension and DA communicate using custom DAP events (there is
support for this in the VS Code API). The DA sends memory and disassembly data
to the extension, and the extension updates its custom views.

### The disassembly view

The disassembly view is implemented in `src/disassemblyView.ts`.
It demonstrates how a virtual document and decorations can be used to provide
custom text-based views that are much less complicated than webviews.

Because of limitations with the VS Code API and the DAP, the implementation is a
bit complicated, and the view lacks some functionality. The
DAP doesn't support having several source files for the same code (i.e. one C
and one disassembly file). Things that are normally handled by VS Code, such as
displaying breakpoints or marking the execution location, you have to implement
manually.
The breakpoints shown in the disassembly view are sent from CSpyRuby to the VS Code
extension with a custom DAP request, and then rendered manually using the
`Decoration` API. Implementing something like setting breakpoints or `Run to
cursor` in this view would be even more complicated.