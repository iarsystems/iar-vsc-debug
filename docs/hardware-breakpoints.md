# IAR C-SPY Debug - Hardware breakpoints

* [Getting started](README.md)
* [Debugging an IAR Embedded Workbench project](debugging-ewp.md)
	* [Customizing a debug configuration](debugging-ewp.md#customizing-a-debug-configuration)
* [Debugging without an IAR Embedded Workbench project](debugging-no-ewp.md)
* [The launch.json format](launch-json-format.md)
* **Using hardware breakpoints**
* [Disassembly and memory view](disassembly-memory-view.md)

---

For most drivers, C-SPY lets you decide whether to use hardware breakpoints, software breakpoints
or whether to let the driver decide the type to use.
VS Code does not have any built-in UI for selecting between hardware- and software breakpoints.
Instead, this extension provides several commands for working with breakpoint types, accessible via the command palette.

> A list of commands with short descriptions
* `Set Breakpoint Type: Hardware` - Makes any new breakpoints use hardware breakpoints.

Note that these commands do not affect existing breakpoints. To change the type of an existing breakpoint,
you must set the desired breakpoint type globally and then remove and re-add the breakpoint (or disable and reenable it).

