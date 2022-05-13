import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OsUtils } from "iar-vsc-common/osUtils";
import { ConfigResolutionCommon } from "./common";

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
    export function provideDebugConfigurations(workspaceFolder: vscode.WorkspaceFolder | undefined, projectFolder: string): ConfigResolutionCommon.PartialConfig[] {
        if (!workspaceFolder) {
            // Can't do anything without a folder.
            return [];
        }

        const settingsDir = path.resolve(projectFolder, FileNames.settingsCatalog);
        if (!fs.existsSync(settingsDir)) {
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

        const configs: ConfigResolutionCommon.PartialConfig[] = [];
        targetXcls.forEach(target => {
            const filePaths = target.split(".");
            if (filePaths[0] === undefined || filePaths[1] === undefined) return;
            const config = convertXclToDebugConfiguration(filePaths[0], filePaths[1], settingsDir);
            if (config) {
                configs.push(config);
            }
        });

        return configs;
    }

    /**
     * Provides a debug configuration for a specific project and project configuration, if possible.
     * @param project The path to a .ewp file
     * @param configuration The name of the project configuration
     */
    export function provideDebugConfigurationFor(project: string, configuration: string): ConfigResolutionCommon.PartialConfig {
        const projName = path.basename(project, ".ewp");
        const settingsDir = path.join(path.dirname(project), FileNames.settingsCatalog);

        const config = convertXclToDebugConfiguration(projName, configuration, settingsDir);
        config.projectPath = project;
        return config;
    }

    /**
     * Reads the content from driver.xcl and general.xcl and attempts to generate a
     * valid launch configuration.
     */
    function convertXclToDebugConfiguration(projectName: string, configuration: string, settingsDir: string): ConfigResolutionCommon.PartialConfig {
        const baseName = generateXclBasename(projectName, configuration);
        const genXclFile = path.join(settingsDir, baseName + FileNames.genXcl);
        const drvXclFile = path.join(settingsDir, baseName + FileNames.drvXcl);
        // We need both files to exist.
        if (!fs.existsSync(genXclFile) || !fs.existsSync(drvXclFile)) {
            throw new Error( `${genXclFile} or ${drvXclFile} is missing.`);
        }

        return generateDebugConfiguration(projectName, configuration, readLinesFromXclFile(genXclFile), readLinesFromXclFile(drvXclFile));
    }

    /**
     * Generate a configuration based on a command line intended for cspybat.
     * May throw if the commands are not well-formed
     * @param projectName The name of the project this configuration is for
     * @param configuration The name of the project configuration this is for.
     * @param generalCommands The set of general commands, i.e., placed before --backend.
     * @param driverCommands The set of options for the driver, i.e., placed after --backend.
     *                       Note that --backend should not be included.
     * @returns a valid launch configuration.
     */
    export function generateDebugConfiguration(
        projectName: string,
        configuration: string,
        generalCommands: string[],
        driverCommands: string[]
    ): ConfigResolutionCommon.PartialConfig {

        let program: string | undefined;
        let driver: string | undefined;
        let target: string | undefined;
        let stopOnEntry = true;
        const plugins: string[] = [];
        const macros: string[] = [];
        const deviceMacros: string[] = [];
        let flashLoader: string | undefined;
        const driverOptions: string[] = [];

        // Read the content from the general file
        if (generalCommands.length < 3) {
            throw new Error("To few entries in the file, Corrupt?");
        } else {
            if (generalCommands[1]) {
                driver = generalCommands[1];
                const pathSegments = OsUtils.splitPath(generalCommands[1]);
                const noSegments = pathSegments.length;
                // The target is listed before bin.
                target = pathSegments[noSegments - 3];
            }
            if (generalCommands[2]) {
                // This is the binary
                program = generalCommands[2];
            }

            // Handle the remaining arguments
            generalCommands.slice(3).forEach(arg => {
                const pluginMatch = Regexps._pluginReg.exec(arg);
                const macroMatch = Regexps._macroReg.exec(arg);
                const deviceMacroMatch = Regexps._deviceMacroReg.exec(arg);
                const flashLoaderMatch = Regexps._flashLoaderReg.exec(arg);
                if (pluginMatch && pluginMatch[1]) {
                    plugins.push(stripQuotes(pluginMatch[1]));
                } else if (macroMatch && macroMatch[1]) {
                    macros.push(stripQuotes(macroMatch[1])); // not tested
                } else if (deviceMacroMatch && deviceMacroMatch[1]) {
                    deviceMacros.push(stripQuotes(deviceMacroMatch[1]));
                } else if (flashLoaderMatch && flashLoaderMatch[1]) {
                    flashLoader = stripQuotes(flashLoaderMatch[1]);
                } else if (Regexps._attachReg.test(arg)) {
                    stopOnEntry = false;
                } else {
                    driverOptions.push(arg);
                }
            });
        }

        if (program === undefined) {
            throw new Error("No program was specified.");
        }
        if (driver === undefined) {
            throw new Error("No driver was specified.");
        }
        if (target === undefined) {
            throw new Error("No target was specified.");
        }

        // Everything in the driver segment can be sent directly to the driverOptions segment
        driverOptions.push(...driverCommands);

        return {
            program,
            driverPath: driver,
            target,
            stopOnEntry,
            projectName,
            configuration,
            plugins,
            macros,
            deviceMacros,
            flashLoader,
            driverOptions,
        };
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