# IAR C-SPY Debugger

Use IAR System's C-SPY Debugger to debug embedded programs using Visual Studio Code, with support for a wide range of embedded devices and debug probes. This extension can be used with IAR Embedded Workbench (.ewp) projects, or with other build systems such as CMake. An IAR Embedded Workbench installation using IDE version 8 or newer is required to use this extension. See [Compatibility](#compatibility) table below for detailed information.

![](https://raw.githubusercontent.com/IARSystems/iar-vsc-debug/master/md-images/debug-session.png)

## Getting Started
**To debug an IAR Embedded Workbench (`.ewp`) project**, we recommend also installing the [IAR Build](https://marketplace.visualstudio.com/items?itemName=iarsystems.iar-build) extension.
The extension will then automatically provide debug configurations for your project.
If you do not have a `launch.json` file in the workspace,
simply press `Run and Debug` in the Debug view to start debugging the current project and configuration.

![](https://raw.githubusercontent.com/IARSystems/iar-vsc-debug/master/md-images/start-session2.gif)

If you already have a `launch.json` file, automatic C-SPY debug configurations can be accessed by pressing `IAR C-SPY Debug...` in
the debug configuration dropdown.

![](https://raw.githubusercontent.com/IARSystems/iar-vsc-debug/master/md-images/debug-dropdown.png)


**To debug a program without an IAR Embedded Workbench project** (e.g. from a CMake project) you need to manually provide a debug
configuration in the form of a `launch.json` file.
There are two ways to do this:
* Follow the instructions for [generating a launch.json configuration](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#CustomizingADebugConfig)
from an IAR Embedded Workbench project and copy the `launch.json file`.
* Create the configuration yourself. Please see the reference for [the launch.json format](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#launch-json-format).

For more help, see [Debugging a stand-alone application](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#debuggingstandaloneprogram).

## Documentation
* [Customizing a debug configuration](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#CustomizingADebugConfig)

* [Making IAR C-SPY Debug settings](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#MakingIARC-SPYDebugSettings)

* [Run menu](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#RunMenu)

* [The Side Bar views](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#IARBuildTasks)

* [Breakpoint types](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#BreakpointTypes)

* [Debugging a stand-alone application](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#debuggingstandaloneprogram)

* [The launch.json format](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md#launch-json-format)

[Click here](https://github.com/IARSystems/iar-vsc-debug/blob/master/docs/README.md) to view the full documentation.

## Compatibility
This extension is compatible with selected IAR Embedded Workbench (EW) products using IDE version 9 or newer. The following table decsribes the level of support for your specific product:

<details><summary>IAR EW - Compatibility table</summary>

| IAR EW version  | Limitation
|--------------|---------
| Arm v9.30 or later | None |
| RISC-V v3.10 or later | Terminal I/O is not supported |
| Arm v8.50-9.20.4<br>RH850 v3.10 or later| An initial debug session with EW is required prior to debugging in VSCode |
| Arm v8.40-8.50 | The variables view is not supported |

</details>

## Feedback
Depending on which feedback you want to share with us, here are the preferred options:
* If you have ideas on how to improve this extension or if you have found issues with it, see [CONTRIBUTING.md](https://github.com/IARSystems/iar-vsc-debug/blob/master/CONTRIBUTING.md) on how to proceed.

* If you are unable to start a debug session in Visual Studio Code, verify that debugging in IAR Embedded Workbench works (to rule out any non-Visual Studio Code related issues).

* If you have issues with the underlying IAR Embedded Workbench product, report this via the IAR Systems technical support channel at [IAR Technical Support](https://www.iar.com/knowledge/support/).

