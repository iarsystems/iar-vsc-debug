/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import * as vscode from "vscode";
import * as Path from "path";
import { CSpyLaunchRequestArguments } from "../../dap/cspyDebug";
import { OsUtils } from "iar-vsc-common/osUtils";
import { CSpyDriver } from "../../dap/breakpoints/cspyDriver";

/**
 * Helpers for creating/resolving C-SPY debug configurations
 */
export namespace ConfigResolutionCommon {
    /**
     * A partially resolved debug configuration corresponding *roughly* to a {@link CSpyLaunchRequestArguments}.
     * To create a launch.json debug configuration matching it, call {@link toLaunchJsonConfiguration}.
     */
    export interface PartialConfig {
        program: string;
        driverPath: string;
        target: string;
        stopOnSymbol: string | boolean;
        projectPath: string;
        configuration: string;
        plugins: string[];
        setupMacros: string[];
        deviceMacros: string[];
        flashLoader: string | undefined;
        driverOptions: string[];
    }

    /**
     * Creates a VS Code debug configuration (a launch.json config) from a partial configuration. This does some
     * processing of fields (such as extracting the name from driver dlls and converting to workspace-relative paths),
     * and also adds VS Code-specific fields.
     * @param parts The partial configuration from some configuration provider
     * @param wsDir The workspace folder this configuration will be used in
     * @param workbenchPath The workbench that was used to generate the config, if known
     */
    export function toLaunchJsonConfiguration(
        parts: PartialConfig,
        wsDir?: string,
        workbenchPath?: string,
    ): vscode.DebugConfiguration & CSpyLaunchRequestArguments {

        // The driver is usually given as a path to a shared library file (e.g. libarmsim2.so), so remove the
        // directory part, the target name and any extensions
        const driverFile = basename(parts.driverPath);
        // Lowercase here is mostly for display purposes - the debug adapter resolves drivers case-insensitive anyway
        const driverName = CSpyDriver.getDriverName(driverFile, parts.target, parts.driverOptions);

        // Express the program and project as a workspace-relative path if possible
        const program = wsDir ? toWorkspaceRelativePath(parts.program, wsDir) : parts.program;
        const project = wsDir ? toWorkspaceRelativePath(parts.projectPath, wsDir) : parts.projectPath;
        const projectName = Path.basename(parts.projectPath, ".ewp");

        // The rh850 and rl78 emulator drivers save some driver parameters in a settings file.
        const emulatorDrivers: string[] = [
            CSpyDriver.DriverNames.E1,
            CSpyDriver.DriverNames.E2,
            CSpyDriver.DriverNames.E20,
            CSpyDriver.DriverNames.E2LITE,
            CSpyDriver.DriverNames.EZCUBE,
            CSpyDriver.DriverNames.EZCUBE2,
            CSpyDriver.DriverNames.IECUBE,
            CSpyDriver.DriverNames.TK,
        ];
        if (emulatorDrivers.includes(driverName) && ["rh850", "rl78", "rx"].includes(parts.target)) {
            parts.driverOptions.push("--cspybat_inifile");
            parts.driverOptions.push(Path.join(Path.dirname(project), `settings/${projectName}.dnx`));
        }

        // Simplify paths by using $TOOLKIT_DIR$
        if (workbenchPath) {
            const toolkitDir = Path.join(workbenchPath, parts.target);
            const makeRelative = (path: string) => toToolkitRelativePath(path, toolkitDir);
            parts.driverOptions = parts.driverOptions.map(makeRelative);
            parts.deviceMacros  = parts.deviceMacros.map(makeRelative);
            parts.setupMacros   = parts.setupMacros.map(makeRelative);
            if (parts.flashLoader) {
                parts.flashLoader   = makeRelative(parts.flashLoader);
            }
        }

        // Assemble the configuration
        const config: vscode.DebugConfiguration & CSpyLaunchRequestArguments = {
            type: "cspy",
            request: "launch",
            name: projectName + "." + parts.configuration.replace(/ /g, "_"),
            target: parts.target.toLowerCase(),
            program: program,
            driver: driverName,
            stopOnSymbol: parts.stopOnSymbol,
            workbenchPath: "${command:iar-config.toolchain}",
            projectPath: project,
            projectConfiguration: parts.configuration,
            driverOptions: parts.driverOptions,
        };

        if (parts.setupMacros.length > 0) {
            config.setupMacros = parts.setupMacros;
        }

        if (parts.deviceMacros.length > 0 || parts.flashLoader !== undefined) {
            config.download = {
                flashLoader: parts.flashLoader,
                deviceMacros: parts.deviceMacros,
            };
        }


        // Remove libsupport plugin(s), since we use our own, and e.g armbat
        parts.plugins = parts.plugins.filter(plugin => {
            return !/libsupport.(dll|so)$/.test(plugin) && !/bat.(dll|so)$/.test(plugin);
        });
        if (parts.plugins.length > 0) {
            config.plugins = parts.plugins.map(basename);
        }

        return config;
    }

    // Converts `path` to a path that is expressed as relative to the given workspace directory.
    // If `path` is not in `wsDir`, returns `path` as-is.
    function toWorkspaceRelativePath(path: string, wsDir: string) {
        const wsRelativePath = Path.relative(wsDir, path);
        if (!wsRelativePath.startsWith("..") && !Path.isAbsolute(wsRelativePath)) {
            return Path.join("${workspaceFolder}", wsRelativePath);
        }
        return path;
    }

    // Converts `path` to a path that is expressed as relative to the given toolkit directory.
    // If `path` is not in `toolkitDir`, returns `path` as-is.
    function toToolkitRelativePath(path: string, toolkitDir: string) {
        const toolkitRelativePath = Path.relative(toolkitDir, path);
        if (!toolkitRelativePath.startsWith("..") && !Path.isAbsolute(toolkitRelativePath)) {
            return Path.join("$TOOLKIT_DIR$", toolkitRelativePath);
        }
        return path;
    }

    // Gets the basename (the last portion) of a path. This function handles both back- and forward slashes,
    // regardless of what OS it is run on.
    function basename(path: string): string {
        const pathSegments = OsUtils.splitPath(path);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return pathSegments[pathSegments.length - 1]!;

    }
}