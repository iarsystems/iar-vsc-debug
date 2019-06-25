# vscode-mock-debug

This is a VS Code extension based on `vscode-mock-debug`, an example project from Microsoft for developing a Debug Adapter.
The extension provides a Debug Adapter that connects to a C-SPY instance via a CSpyRuby script,
thus enabling some rudimentary C-SPY debugging functionality in VS Code.

<!-- TODO: något om att detta inte är produktionsfärdigt, att CSpyRuby inte heller kan användas i produktion -->

## Using this extension

To use this extension, first make sure `CSpyRuby` is installed and the `CSpyRuby.exe` file is in the `common/bin` folder of your EW installation.
Then, make sure `CSPYRubySetup` is a sibling to the root directory of this project (if you've cloned the repo, it should already be).
To run the extension, open this folder in VS Code, press `F5`, and launch the `Extension + Server` configuration.
In the new window, you may open an EW project folder, such as `ew-test-project` in this repository.
Then, open up `.vscode/launch.json` within the project folder and make sure `workbenchPath` points to your EW installation (if the file isn't there, press `F5` and it should be generated).
The project may then be debugged by pressing `F5` or from the debugging menu in the panel on the left.

## Integrating specific functionality

The VS Code debugging interface only includes the most common debugging functionality. The following is supported:

+ Item 1 TODO:

This functionality would be relatively simple to implement, since most of the work is already done by VS Code and the Debug Adapter SDK (most of these things are already implemented in this project).

For functionality that is not supported by VS Code (such as a dissassembly window), it wouldn't be possible to rely on VS Code's interface or the Debug Adapter protocol;
both the interface and the way the data in it is obtained, would have to be implemented without much support from the VS Code API.

<!-- TODO: kolla om man kan lägga till debuggingfönster https://github.com/Microsoft/vscode/issues/3866 https://code.visualstudio.com/api/extension-guides/webview -->

In June 2019, Microsoft introduced support for reading registers, memory and disassembly to the DAP (see [here](https://github.com/microsoft/debug-adapter-protocol/pull/50) and [here](https://microsoft.github.io/debug-adapter-protocol/specification#Requests_ReadMemory)). It is up to each DAP client
(i.e. each editor/IDE) to implement the corresponding interface and as mentioned, VS Code has not done so.
The VS Code development team seem to be of the opinion that it is up to each extension to implement
advanced debugging views (see [this issue](https://github.com/Microsoft/vscode/issues/3866) and [this issue](https://github.com/microsoft/vscode/issues/31901)).
There are a few extensions which have
TODO: custom requests till debug adapter?

As mentioned in `debugging.md` the DAP is also supported, among others,
by Visual Studio and by Eclipse (via a plugin). Both of these IDEs already have register, memory and disassembly debug views which, if they become
integrated with the new DAP extensions, could be used with a C-SPY Debug Adapter.

It might be worth looking at integrating some C-SPY functionality via the debug console instead of in the GUI.
VS Code provides a REPL console (the 'debug console'), and it would be reasonably simple to implement commands for
e.g. printing a memory representation in that console.

<!-- TODO: hänvisa till rubyscriptet -->
