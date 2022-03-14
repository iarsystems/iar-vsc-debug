import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OsUtils } from "../utils/osUtils";

/**
 * Provides automatic debug configurations from the .xcl files in a project folder
 */
export namespace XclConfigurationProvider {
    namespace FileNames {
        // Catalog and file names
        export const drvXcl = ".driver.xcl";
        export const genXcl = ".general.xcl";
        export const settingsCatalog = "settings";
    }
    namespace Regexps {
        // Regexps
        export const _pluginReg = new RegExp(/--plugin=(.+)$/);
        export const _macroReg = new RegExp(/--macro=(.+)$/);
        export const _deviceMacroReg = new RegExp(/--device_macro=(.+)$/);
        export const _flashLoaderReg = new RegExp(/--flash_loader=(.+)$/);
        export const _attachReg = new RegExp(/\s*--attach_to_running_target\s*/);
    }

    /**
     * Provides all debug configurations from a project folder. This may include several projects and project configurations.
     */
    export function provideDebugConfigurations(workspaceFolder: vscode.WorkspaceFolder | undefined, projectFolder: string): vscode.DebugConfiguration[] {
        if (!workspaceFolder) {
            // Can't do anything without a folder.
            return [];
        }

        const settingsDir = path.resolve(projectFolder, FileNames.settingsCatalog);
        if (!fs.existsSync(settingsDir)) {
            console.error("No settings catalog is available");
            return [];
        }

        // Collect the potential targets.
        const targetXcls: string[] = [];
        fs.readdirSync(settingsDir).forEach(file => {
            const baseName = path.basename(file);
            if (baseName.endsWith(FileNames.genXcl)) {
                targetXcls.push(baseName.replace(FileNames.genXcl, ""));
            }
        });

        const configs: vscode.DebugConfiguration[] = [];
        targetXcls.forEach(target => {
            const filePaths = target.split(".");
            const config = convertXclToDebugConfiguration(workspaceFolder.uri.fsPath, projectFolder, filePaths[0], filePaths[1]);
            if (config) {
                configs.push(config);
            }
        });

        return configs;
    }

    /**
     * Provides a debug configuration for a specific project and project configuration, if possible.
     * @param workspaceFolder The current workspace folder, used to generate workspace-relative paths
     * @param project The path to a .ewp file
     * @param configuration The name of the project configuration
     */
    export function provideDebugConfigurationFor(workspaceFolder: vscode.WorkspaceFolder, project: string, configuration: string): vscode.DebugConfiguration {
        const projName = path.basename(project, ".ewp");
        const projDir = path.dirname(project);
        const xclBaseName = generateXclBasename(projName, configuration);
        const genXclFile = path.join(projDir, FileNames.settingsCatalog, `${xclBaseName}${FileNames.genXcl}`);
        const drvXclFile = path.join(projDir, FileNames.settingsCatalog, `${xclBaseName}${FileNames.drvXcl}`);
        // Ensure that both the files exists on disk.
        let errMsg = "Unknown error.";
        if (fs.existsSync(genXclFile) && fs.existsSync(drvXclFile)) {
            const config = convertXclToDebugConfiguration(workspaceFolder.uri.fsPath, projDir, projName, configuration);
            if (config) {
                return config;
            }
            errMsg = "Failed to generate launch configuration.";
        } else {
            errMsg = `${genXclFile} or ${drvXclFile} is missing.`;
        }
        throw new Error(errMsg);
    }

    /**
     * Reads the content from driver.xcl and general.xcl and attempts to generate a
     * valid launch configuration.
     * @param wsDir The current workspace directory.
     * @param ewpDir The folder in which the ewp-file is located.
     * @param projName The name of the project
     * @param configName the name of the configuration
     * @returns undefined if fail or a valid launch configuration.
     */
    function convertXclToDebugConfiguration(wsDir: string, ewpDir: string, projName: string | undefined, configName: string | undefined): vscode.DebugConfiguration | undefined {
        if (!projName || !configName) {
            return undefined;
        }

        const baseName = generateXclBasename(projName, configName);
        const genXclFile = path.join(ewpDir, FileNames.settingsCatalog, baseName + FileNames.genXcl);
        const drvXclFile = path.join(ewpDir, FileNames.settingsCatalog, baseName + FileNames.drvXcl);

        // We need both files to exist.
        if (!fs.existsSync(genXclFile) || !fs.existsSync(drvXclFile)) {
            return undefined;
        }

        return generateDebugConfiguration(wsDir, ewpDir, baseName, configName, readLinesFromXclFile(genXclFile), readLinesFromXclFile(drvXclFile));
    }

    /**
     * Generate a configuration based on a command line intended for cspybat.
     * @param wsDir The current workspace directory
     * @param ewpDir The folder in which the ewp file is placed
     * @param launchName The name of the launches
     * @param configuration The name of the configuration.
     * @param generalCommands The set of general commands, i.e., placed before --backend.
     * @param driverCommands The set of options for the driver, i.e., placed after --backend.
     *                       Note that --backend should not be included.
     * @returns undefined if fail or a valid launch configuration.
     */
    export function generateDebugConfiguration(wsDir: string, ewpDir: string, launchName: string, configuration: string, generalCommands: string[], driverCommands: string[]): vscode.DebugConfiguration | undefined {
        // Start to assemble the configuration
        const config: vscode.DebugConfiguration = {
            "name": launchName,
            "type": "cspy",
            "request": "launch",
            "stopOnEntry": true
        };

        // The set of listed plugins (--plugins option) and regex
        const plugins: string[] = [];
        // The set of listed macros (--macros option) and regex
        const macros: string[] = [];
        // The set of listed device macros (--device_macro option) and regex
        const deviceMacros: string[] = [];
        // The selected flash loader (if any)
        let flashLoader: string | undefined;
        // The rest which is just sent to the backend directly.
        const options: string[] = [];

        // Read the content from the general file
        if (generalCommands.length < 3) {
            console.error("To few entries in the file, Corrupt?");
            return undefined;
        } else {
            if (generalCommands[1]) {
                const pathSegments = OsUtils.splitPath(generalCommands[1]);
                const noSegments = pathSegments.length;
                // The target is listed before bin.
                const target = pathSegments[noSegments - 3];
                config["target"] = target;
                // The driver is given as libarmsim2.so or armsim2.dll so remove
                // the target name and any extensions
                const driverRegex = new RegExp(`(lib|.so|.dll|${target})`, "g");
                const driver = pathSegments[pathSegments.length - 1]?.replace(driverRegex, "");
                // Drivers are resolved case-insensitive by the debug adapter, so we can standardize the name to lowercase
                config["driver"] = driver?.toLowerCase();
            }
            if (generalCommands[2]) {
                // This is the binary. Resolve it if it's placed in the current ws.
                const wsRelativePath = path.relative(wsDir, generalCommands[2]);

                if (!wsRelativePath.startsWith("..") && !path.isAbsolute(wsRelativePath)) {
                    // Add the path as a relative path.
                    config["program"] = path.join("${workspaceFolder}", wsRelativePath);
                } else {
                    // Just add it as is
                    config["program"] = generalCommands[2];
                }
            }

            // Handle the remaining arguments
            generalCommands.slice(3).forEach(arg => {
                const pluginMatch = Regexps._pluginReg.exec(arg);
                const macroMatch = Regexps._macroReg.exec(arg);
                const deviceMacroMatch = Regexps._deviceMacroReg.exec(arg);
                const flashLoaderMatch = Regexps._flashLoaderReg.exec(arg);
                if (pluginMatch && pluginMatch[1]) {
                    if (!/bat.(dll|so)$/.test(pluginMatch[1])) { // remove e.g. armbat plugin
                        plugins.push(path.parse(stripQuotes(pluginMatch[1])).name);
                    }
                } else if (macroMatch && macroMatch[1]) {
                    macros.push(stripQuotes(macroMatch[1])); // not tested
                } else if (deviceMacroMatch && deviceMacroMatch[1]) {
                    deviceMacros.push(stripQuotes(deviceMacroMatch[1]));
                } else if (flashLoaderMatch && flashLoaderMatch[1]) {
                    flashLoader = stripQuotes(flashLoaderMatch[1]);
                } else if (Regexps._attachReg.test(arg)) {
                    config["stopOnEntry"] = false;
                } else {
                    options.push(arg);
                }
            });
        }

        // Add the workbench options.
        config["workbenchPath"] = "${command:iar-settings.toolchain}";
        config["projectPath"] = ewpDir;
        config["projectConfiguration"] = configuration;

        if (macros.length > 0) {
            config["setupMacros"] = macros;
        }

        if (deviceMacros.length > 0 || flashLoader !== undefined) {
            config["download"] = {
                flashLoader: flashLoader,
                deviceMacros: deviceMacros,
            };
        }


        if (plugins.length > 0) {
            config["plugins"] = plugins;
        }

        // Everything in the driver segment can be sent directly to the driverOptions segment
        config["driverOptions"] = options.concat(driverCommands);

        return config;
    }

    function readLinesFromXclFile(xclPath: string): string[] {
        return fs.readFileSync(xclPath).toString().
            split(/\r\n|\n/).
            map(stripQuotes).
            filter(line => line !== "");
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

    function generateXclBasename(projectName: string, configuration: string) {
        return projectName + "." + configuration.replace(/ /g, "_");
    }
}