# IAR C-SPY Debug - Debugging an IAR Embedded Workbench project

* [Getting started](README.md)
* **Debugging an IAR Embedded Workbench project**
	* Customizing a debug configuration
* [Debugging without an IAR Embedded Workbench project](debugging-no-ewp.md)
* [The launch.json format](launch-json-format.md)
* [Using hardware breakpoints](hardware-breakpoints.md)
* [Disassembly and memory view](disassembly-memory-view.md)

---

To debug an IAR Embedded Workbench (`.ewp`) project, we highly recommend also installing the [IAR Build](https://marketplace.visualstudio.com/items?itemName=iarsystems.iar-vsc) extension.

If you wish to debug a project without the IAR Build extension, you must manually provide a debug configuration, please see [the launch.json format](launch-json-format.md).
The rest of this section assumes that you have installed the IAR Build extension.

The extension will then automatically provide debug configurations for your project...
If you do not have a `launch.json` file in the workspace,
simply press `Run and Debug` in the Debug view to start debugging the current project and configuration.

If you already have a `launch.json` file, automatic C-SPY debug configurations can be accessed by pressing `IAR C-SPY Debug...` in
the debug configuration dropdown.


## Customizing a debug configuration

If you want to change some debugging parameters or set up VS Code to automatically build your project before starting a debug session,
you can do so by creating a `launch.json` configuration.

In the debugging view, press `Show all automatic debug configurations`, then `IAR C-SPY Debug` and then click the gear icon next to the configuration
you want to customize. This will create a `launch.json` file...
If you already have a `launch.json` file, you can access the automatic debug configurations from the debug configuration dropdown as described above.

To set up VS Code to automatically build the current project configuration before debugging, add a `preLaunchTask` to the `launch.json` configuration:
```json
"preLaunchTask": "iar: Build Project"
```

Please see [this section](launch-json-format.md) for more information about the `launch.json` format.
