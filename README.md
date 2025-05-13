# IAR C-SPY Debug

Debug your applications with the IAR C-SPY Debugger in Visual Studio Code with the IAR C-SPY Debug extension. The IAR C-SPY Debugger features support for a wide range of embedded devices and debug probes. This extension can be used for debugging programs created from IAR Embedded Workbench projects (`*.ewp`, `*.ewd`), or from 3<sup>rd</sup> party build systems such as CMake.

![A VS Code window with a C-SPY debug session](https://raw.githubusercontent.com/IARSystems/iar-vsc-debug/master/md-images/debug-session.png)

## Getting Started

An IAR Embedded Workbench or IAR Build Tools installation is required to use this extension. See the [Compatibility](#compatibility) section below for detailed information.

### Debugging an executable built from an IAR Embedded Workbench project

For the best experience, install the [IAR Build](https://marketplace.visualstudio.com/items?itemName=iarsystems.iar-build) extension. The IAR C-SPY Debug extension will then automatically provide debug configurations taken from the IAR Embedded Workbench project (`*.ewp`, `*.ewd`). Simply switch to the __Run and Debug__ view, press the __Run and Debug__ button, and start debugging the current executable.

![A user clicking 'Run and Debug' and starting a debug session](https://raw.githubusercontent.com/iarsystems/iar-vsc-debug/master/md-images/start-session2.gif)

Visual Studio Code stores debug configurations for its current workspace in the `.vscode/launch.json` configuration file. If the workspace already has a `.vscode/launch.json` file, choosing __IAR C-SPY Debug...__ in the debug configuration dropdown menu will offer debug configurations generated for your project.

![A user hovering over the 'IAR C-SPY Debug...' option](https://raw.githubusercontent.com/iarsystems/iar-vsc-debug/master/md-images/debug-dropdown.png)

### Debugging an executable built from a 3<sup>rd</sup> party build system

There are two ways for creating the `.vscode/launch.json` configuration file when debugging a program built from a 3<sup>rd</sup> party build system, such as CMake:

* Follow the instructions for [generating a launch.json configuration](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#CustomizingADebugConfig) from a separate IAR Embedded Workbench project with the desired target and probe selections and copy the generated `.vscode/launch.json` configuration file to the workspace.
* Create the configuration yourself. Please see the reference for [the launch.json format](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#launch-json-format).

For more help, see [Debugging a stand-alone application](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#debuggingstandaloneprogram).

## Documentation

* [Customizing a debug configuration](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#CustomizingADebugConfig)

* [Making IAR C-SPY Debug settings](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#MakingIARC-SPYDebugSettings)

* [Run menu](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#RunMenu)

* [The Side Bar views](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#IARBuildTasks)

* [Breakpoint types](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#BreakpointTypes)

* [Debugging a stand-alone application](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#debuggingstandaloneprogram)

* [The launch.json format](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md#launch-json-format)

[Click here](https://github.com/iarsystems/iar-vsc-debug/blob/master/docs/README.md) to view the full documentation.

## Compatibility

This extension is compatible with selected versions of the IAR Embedded Workbench (EW) or IAR Build Tools (BX) installations. The table below lists known limitations of this extension concerning earlier versions of both IAR products for each supported target architecture:

| Target architecture    | Product Version | Known Limitation
|------------------------|-----------------|-----------
| Arm | v9.60.2 or later | None.
| Arm | v9.50.1-9.50.2   | IAR Build Tools on Linux and IAR Embedded Workbench only.
| Arm<br>RISC-V<br>AVR<br>RH850<br>RL78<br>RX<br>MSP430| v8.40.1-9.40.2 <br>v3.10.1 or later <br>v8.10.1 or later <br>v3.10.1 or later <br>v5.10.1 or later <br>v5.10.1 or later <br>v8.10.2 | IAR Embedded Workbench on Windows only.
| RISC-V | v3.10.1 | Terminal I/O is not supported.
| Arm<br>RH850 | v8.50.1-9.20.4 <br>v3.10.1 or later | A prior debug session launched from EW is initially required<br>before launching a debug session in VS Code.
| Arm<br>RH850 | v8.40.1-9.10.2 <br>v3.10.1-3.10.2 | Multicore debugging instability, leading to potential crashes.
| Arm | v8.40.1-8.50.10 | The _variables view_ is not supported.

## Feedback

If you are unable to launch a debug session in Visual Studio Code, rule out any unrelated issues by verifying that debugging in IAR Embedded Workbench works.
Depending on the type of feedback you want to share with us, here are our preferred options:

* For urgent matters with the extension, or if you have issues with the underlying IAR Embedded Workbench or IAR Build Tools product, report them via the [IAR Technical Support](https://www.iar.com/knowledge/support/request-technical-support/) channel.

* For other matters isolated to this extension, file a [New issue](https://github.com/iarsystems/iar-vsc-debug/issues/new/choose) using the provided template. We will reply on a "best effort basis".

* If you have ideas on how to improve this extension, see [CONTRIBUTING.md](https://github.com/iarsystems/iar-vsc-debug/blob/master/CONTRIBUTING.md) on how to proceed.
