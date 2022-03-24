# IAR C-SPY Debug - Debugging an IAR Embedded Workbench project

* [Getting started](README.md)
* [Debugging an IAR Embedded Workbench project](debugging-ewp.md)
	* [Customizing a debug configuration](debugging-ewp.md#customizing-a-debug-configuration)
* **Debugging without an IAR Embedded Workbench project**
* [The launch.json format](launch-json-format.md)
* [Using hardware breakpoints](hardware-breakpoints.md)
* [Disassembly and memory view](disassembly-memory-view.md)

---


This extension supports debugging standalone programs without an associated `.ewp` project, such as programs built with CMake.

Since there is no project to automatically generate a debug configuration from, you must manually provide a debug configuration
in the form of a `launch.json` file.

There are two ways to do this:
* Use the IAR Embedded Workbench IDE to create an empty project and select the desired device, driver and options.
Then, follow the instructions for [generating a launch.json configuration]() from an IAR Embedded Workbench project.
This will give you a `launch.json` file that you can copy to your VS Code workspace folder and use to start a debugging session.
* Create the `launch.json` configuration yourself. This can be tricky. Please see the reference for [the launch.json format]().