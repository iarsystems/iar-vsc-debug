/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as path from "path";
import { ConfigResolutionCommon } from "./common";

/**
 * Provides automatic debug configurations from the build extension (i.e. using the project manager directly).
 * The downside compared to using .xcl files is that the project must be loaded (and that the build extension must be installed).
 */
export namespace BuildExtensionConfigurationProvider {

    /**
     * Provides a debug configuration for a specific project and project configuration, if possible.
     * @param cspyCommands The C-SPY commands retrieved from the build extension
     * @param projectPath The path to a .ewp file
     * @param configName The name of the project configuration
     * @param target The target platform (e.g. arm)
     */
    export function provideDebugConfigurationFor(
        cspyCommands: string[],
        projectPath: string,
        configName: string,
        target: string
    ): ConfigResolutionCommon.PartialConfig {
        return parseCspyCommandLine(cspyCommands, projectPath, configName, target);
    }

    // Parses c-spy arguments into a debug configuration. Corresponds to DlDebugConfiguration::ParseArguments
    function parseCspyCommandLine(cspyCommands: string[], projPath: string, configName: string, target: string): ConfigResolutionCommon.PartialConfig {
        let program: string | undefined;
        let driver: string | undefined;
        let stopOnEntry = false;
        const plugins: string[] = [];
        const macros: string[] = [];
        const deviceMacros: string[] = [];
        let flashLoader: string | undefined;
        const driverOptions: string[] = [];

        cspyCommands = cspyCommands.map(stripQuotes);

        while (cspyCommands.length > 0) {
            let val: string | undefined;
            if ((val = consumeArg1("/file", cspyCommands)) !== undefined) {
                program = val;
            } else if ((val = consumeArg1("/runto", cspyCommands)) !== undefined) {
                // Right now we don't support arbitrary symbol names here
                stopOnEntry = true;
            } else if ((val = consumeArg1("/driver", cspyCommands)) !== undefined) {
                driver = val;
            } else if ((val = consumeArg1("/plugin", cspyCommands)) !== undefined) {
                if (!/libsupport.(dll|so)$/.test(val)) { // remove other libsupport plugins
                    plugins.push(val);
                }
            } else if ((val = consumeArg1("/setup", cspyCommands)) !== undefined) {
                macros.push(val);
            } else if ((val = consumeArg1("/devicesetup", cspyCommands)) !== undefined) {
                deviceMacros.push(val);
            } else if ((val = consumeArg1("/flashboard", cspyCommands)) !== undefined) {
                flashLoader = val;
            } else {
                // other args are not supported
                // ignore other cspy commands, they are not supported for now
                const ignored = consumeArg1("/flashboardpath", cspyCommands) ||
                    consumeArg1("/kernel", cspyCommands) ||
                    consumeArg1("/proc", cspyCommands) ||
                    consumeArg1("/args", cspyCommands) ||
                    consumeArg0("/ilink", cspyCommands) ||
                    consumeArg2("/extradebugfile", cspyCommands) ||
                    consumeArg2("/extradebugfilenodownload", cspyCommands);
                if (!ignored) {
                    val = cspyCommands.shift();
                    if (val) {
                        driverOptions.push(val);
                    }
                }
            }
        }

        if (program === undefined) {
            throw new Error("No program was specified.");
        }
        if (driver === undefined) {
            throw new Error("No driver was specified.");
        }

        return {
            program,
            driverPath: driver,
            target,
            stopOnEntry,
            projectName: path.basename(projPath, ".ewp"),
            projectPath: projPath,
            configuration: configName,
            plugins,
            macros,
            deviceMacros,
            flashLoader,
            driverOptions,
        };
    }

    // Handles a command line options with no parameters, e.g. /ilink
    // If the first argument matches the name, removes it from the array and returns true
    function consumeArg0(argName: string, args: string[]): boolean {
        const arg1 = args[0];
        if (arg1 !== undefined && arg1 === argName) {
            args.shift();
            return true;
        }
        return false;
    }

    // Handles a command line options with one parameter, e.g. /setup <macrofile>.
    // If the first argument matches the name, the first two arguments are removed from the array
    // and the second argument (the parameter value) is returned.
    // Otherwise, the array is unchanged and the function returns undefined.
    function consumeArg1(argName: string, args: string[]): string | undefined {
        const arg1 = args[0];
        const arg2 = args[1];
        if (arg1 !== undefined && arg2 !== undefined) {
            if (arg1 === argName) {
                args.splice(0, 2);
                return arg2;
            }
        }
        return undefined;
    }

    // Handles a command line options with two parameters, e.g. /extradebugfile <pos> <path>
    // If the first argument matches the name, the first three arguments are removed from the array
    // and the second argument and third (the parameter values) are returned.
    // Otherwise, the array is unchanged and the function returns undefined.
    function consumeArg2(argName: string, args: string[]): [string, string] | undefined {
        const arg1 = args[0];
        const arg2 = args[1];
        const arg3 = args[2];
        if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined) {
            if (arg1 === argName) {
                args.splice(0, 3);
                return [arg2, arg3];
            }
        }
        return undefined;
    }

    function stripQuotes(str: string): string {
        str = str.trim();
        if (str.startsWith("\"")) {
            str = str.slice(1);
        }
        if (str.match(/[^\\]"$/)) { // ends with unescaped quoteconst
            str = str.slice(0, -1);
        }
        return str;
    }
}