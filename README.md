# vscode-mock-debug

This is a VS Code extension based on `vscode-mock-debug`, an example project
from Microsoft for developing a Debug Adapter using the TypeScript SDK.
The extension provides a Debug Adapter that connects to a C-SPY instance via a CSpyRuby script,
thus enabling some C-SPY debugging functionality in VS Code.

The Debug Adapter implementation can be found in `src/cspyDebug.ts`.
Two things were missing from CSpyRuby (or I just didn't find them) that would
have been useful:
* Inspecting nested variables (such as seeing the value of struct/class members)
* Getting the current location of the PC in the disassembly window

Aside from the DA, the project also includes a VS Code extension that tells VS
Code how to start the DA, and manages the custom debugging views (memory and
disassembly). The extension and DA communicate using custom DAP events (there is
support for this in the VS Code API). The DA sends memory and disassembly data,
to the extension, and the extension updates its custom views. Also, the
extension creates custom instruction stepping buttons in the VS Code UI, and
sends custom requests to the DA whenever they are pressed.

I've tested the project for ARM using both a simulator and I-JET. However, I had
some difficulties getting CSpyRuby to run on linux, so I've only tested this on windows.

## The disassembly view

The disassembly view is implemented in `src/disassemblyView.ts`.
It demonstrates how a virtual document and decorations can be used to provide
custom text-based views that are much less complicated than webviews.

Because of limitations with the VS Code APi and the DAP, the implementation is a
bit more complicated than necessary, and the view lacks some functionality. The
DAP doesn't support having several source files for the same code (i.e. one C
and one disassembly file). Things that are normally handled by VS Code, such as
displaying breakpoints or marking the execution location, you have to implement
manually.
The breakpoints shown in the disassembly view are sent from CSpyRuby to the VS Code
extension with a custom DAP request, and then rendered manually using the
`Decoration` API. Implementing something like setting breakpoints or `Run to
cursor` would be even more complicated.

## Using this extension

To use this extension, first make sure `CSpyRuby` is installed and the `CSpyRuby.exe` file is in the `common/bin` folder of your EW installation.
Then, make sure `CSPYRubySetup` is a sibling to the root directory of this
project (if you've cloned the repo, it should already be).
Before running the extension, you should install Nodejs and run `npm install` in this directory to
install all dependencies.
To run the extension, open this folder in VS Code, press `F5`, and launch the `Extension + Server` configuration.
In the new window, you may open an EW project folder, such as `ew-test-project` in this repository.
Then, open up `.vscode/launch.json` within the project folder and make sure
`workbenchPath` points to your EW installation (if the file isn't there, press
`F5` and you should be given the option to generate it).
The project may then be debugged by pressing `F5` or from the debugging menu in the panel on the left.
