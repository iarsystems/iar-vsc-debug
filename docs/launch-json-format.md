 # IAR C-SPY Debug - The launch.json format

* [Getting started](README.md)
* [Debugging an IAR Embedded Workbench project](debugging-ewp.md)
	* [Customizing a debug configuration](debugging-ewp.md#customizing-a-debug-configuration)
* [Debugging without an IAR Embedded Workbench project](debugging-no-ewp.md)
* **The launch.json format**
* [Using hardware breakpoints](hardware-breakpoints.md)
* [Disassembly and memory view](disassembly-memory-view.md)

---

Visual Studio Code uses a file called `launch.json` to manage custom debug configurations.

> Dokumentation om launch.json som vi kan länka finns [här](https://code.visualstudio.com/Docs/editor/debugging#_launch-configurations) och [här](https://code.visualstudio.com/Docs/editor/debugging#_launchjson-attributes).

The easiest way to generate a `launch.json` configuration is [from an IAR Embedded Workbench project](debugging-ewp#generating-a-launchjson-configuration),
but you can also write one yourself. The following snippet can be used to get started:
```json
{
	"type": "cspy",
	"request": "launch",
	"name": "Debug with C-SPY",
	"target": "arm",
	"program": "${workspaceFolder}/Debug/Exe/<PROGRAM>.out",
	"stopOnEntry": true,
	"workbenchPath": "<WORKBENCH_PATH>",
	"driver": "sim2",
	"driverOptions": [
		"--endian=little",
		"--cpu=<CPU_NAME>",
		"--fpu=None",
		"--semihosting"
	],
	"download": {
		"flashLoader": "<FLASHLOADER>",
		"deviceMacros": []
	}
},
```

The C-SPY debugger supports the following `launch.json` attributes:
* `stopOnEntry` - Whether to stop on `main` when starting a debug session.
...
> En kort beskrivning av varje attribut finns i package.json. Vi bör nog hänvisa till C-SPYs dokumentation för `driverOptions`-attributet (kommandoradsparametrar).