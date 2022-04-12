# IAR C-SPY Debugger

Use IAR System's C-SPY Debugger to debug embedded programs using Visual Studio Code, with support for a wide range of embedded devices and debug probes. This extension can be used with IAR Embedded Workbench (.ewp) projects, or with other build systems such as CMake. An IAR Embedded Workbench installation for Arm or RISC-V is required to use this extension.

![](../md-images/debug-session.png)

## Getting Started
**To debug an IAR Embedded Workbench (`.ewp`) project**, we recommend also installing the [IAR Build](http://link.to/marketplace/for/the/extension) extension.
The extension will then automatically provide debug configurations for your project.
If you do not have a `launch.json` file in the workspace,
simply press `Run and Debug` in the Debug view to start debugging the current project and configuration.

![](../md-images/start-session2.gif)

If you already have a `launch.json` file, automatic C-SPY debug configurations can be accessed by pressing `IAR C-SPY Debug...` in
the debug configuration dropdown.

![](../md-images/debug-dropdown.png)


**To debug a program without an IAR Embedded Workbench project** (e.g. from a CMake project) you need to manually provide a debug
configuration in the form of a `launch.json` file.
There are two ways to do this:
* Follow the instructions for [generating a launch.json configuration]() from an IAR Embedded Workbench project and copy the `launch.json file`.
* Create the configuration yourself. Please see the reference for [the launch.json format]().

For more help, see [Debugging without an IAR Embedded Workbench project]().

## Documentation
* [Debugging an IAR Embedded Workbench project]()
	* [Generating a launch.json configuration]()
* [Debugging without an IAR Embedded Workbench project]()
* [The launch.json format]()
* [Using hardware breakpoints]()
* [Disassembly and memory view]()

[Click here]() to view the full documentation.

## Compatibility
This extension supports IAR Embedded Workbench for Arm and RISC-V.
The table below helps you find the extension version supported by your IAR Embedded Workbench.
The IAR shared components version can be found in IAR Embedded Workbench by going to `Help->About->Product Info...`
or by looking at the version number printed when running `iarbuild`.

## Compatibility
This extension is compatible with selected IAR Embedded Workbench (EW) products using IDE version 8 or newer. The following table decsribes the level of support for your specific product: 

<details><summary>IAR EW - Compatibility table</summary>

| IAR EW version  | Limitation
|--------------|---------
| ARM v9.30 or later <br>RH850 v3.10 or later<br> | None |
| ARM v8.40-9.20.4| An initial debug session with EW is required prior to debugging in VSCode. |

</details>

## Feedback
Depending on which feedback you want to share with us, here are the preferred options:
* If you have ideas on how to improve this extension or if you have found issues with it, see [contributing.md](https://www.iar.com/knowledge/support/) on how to proceed.

* If you have issues with the underlying IAR Embedded Workbench or IAR Built Tools product, report this via the IAR Systems technical support channel at [IAR Technical Support](https://www.iar.com/knowledge/support/).
