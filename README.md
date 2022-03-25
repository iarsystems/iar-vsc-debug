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

<details><summary>IAR EW - Compatibility table</summary>

| IAR shared components version  | Compatible extension version | Download link
|--------------|-----------|---------
| 9.20 | >1.1 (current)  | Download from marketplace
| 8.0 - 9.10.1      | 1.0 | [iar-dbg-1.0.vsix]()
| < 8.0     | Unsupported | -

</details>

To download an older version of the extension, right click this extension in the Extensions view and select `Install Another Version...`.

## Feedback
[Technical Support](https://www.iar.com/knowledge/support/)\
File questions, issues or feature requests for the extension to IAR Systems technical support.

[Known Problems]()\
The list of known problems with this extension.

<!-- ## Contributions
Contributions are always welcome. Or did we decide to have a read-only repository? -->
