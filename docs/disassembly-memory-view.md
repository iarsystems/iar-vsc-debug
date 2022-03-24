# IAR C-SPY Debug - Dissasembly and memory view

* [Getting started](README.md)
* [Debugging an IAR Embedded Workbench project](debugging-ewp.md)
	* [Customizing a debug configuration](debugging-ewp.md#customizing-a-debug-configuration)
* [Debugging without an IAR Embedded Workbench project](debugging-no-ewp.md)
* [The launch.json format](launch-json-format.md)
* [Using hardware breakpoints](hardware-breakpoints.md)
* **Disassembly and memory view**

---

> Det här avsnittet dokumenterar funktionalitet som är inbyggd i VS Code, men jag tycker det är rättfärdigat eftersom det
> är ganska ny funktionalitet och den är ganska svårhittad.

This extension supports VS Code's built-in disassembly view. It can be opened by right-clicking in the stack view...
> [Dokumentation](https://devblogs.microsoft.com/cppblog/visual-studio-code-c-july-2021-update-disassembly-view-macro-expansion-and-windows-arm64-debugging/#disassembly-view)

The built-in memory viewer can be opened from the variables view by pressing the `View Binary Data` button on a variable.
This opens a hex editor at the variable's memory location. Note that this is only available for static variables.

Note that you cannot open arbitrary memory locations... ... this is a limitation of the view itself.
