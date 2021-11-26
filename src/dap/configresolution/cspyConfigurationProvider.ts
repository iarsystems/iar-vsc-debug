import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { OsUtils } from "../../utils/osUtils";

/**
 * This class is used to generate the launch.json content on the fly and from explicit commands.
 * The class should not carry any states as it may be used from multiple places.
 */
export class CSpyConfigurationProvider implements vscode.DebugConfigurationProvider {

    private static _theProvider: CSpyConfigurationProvider | undefined = undefined;
    // Catalog and file names
    private readonly _drvXcl = ".driver.xcl";
    private readonly _genXcl = ".general.xcl";
    private readonly _settingsCatalog = "settings";
    // Regexps
    private readonly _pluginReg = new RegExp(/--plugin=(.+)$/);
    private readonly _macroReg = new RegExp(/--macro=(.+)$/);
    private readonly _attachReg = new RegExp(/\s*--attach_to_running_target\s*/);

    public static getProvider() {
        if (!this._theProvider) {
            this._theProvider = new CSpyConfigurationProvider();
        }
        return this._theProvider;
    }

    // The constructor is private.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() { }

    private readLinesFromXclFile(xclPath: string): string[] {
        return fs.readFileSync(xclPath).toString().
            split(/\r\n|\n/).
            map(this.stripQuotes).
            filter(line => line !== "");
    }

    private stripQuotes(str: string): string {
        str = str.trim();
        if (str.startsWith("\"")) {
            str = str.slice(1);
        }
        if (str.match(/[^\\]"$/)) { // ends with unescaped quoteconst
            str = str.slice(0, -1);
        }
        return str;
    }

    /**
     * This is called when starting a session on the fly. We will only support this if the needed xcl-files are present!
     */
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, _token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {

        if (!config.type && !config.request && !config.name && folder) {
            // Handle empty or non-existant launches
            const vscContent = this.getVscJson(folder);
            const ewpFile = vscContent["ewp"];
            const configName = vscContent["configuration"];
            let errMsg = "Unknown error";
            if (ewpFile && configName) {
                const projName = path.basename(ewpFile, ".ewp");
                const projDir = path.dirname(ewpFile);
                const xclBaseName = projName + "." + configName;
                const genXclFile = path.resolve(projDir, this._settingsCatalog, `${xclBaseName}${this._genXcl}`);
                const drvXclFile = path.resolve(projDir, this._settingsCatalog, `${xclBaseName}${this._drvXcl}`);
                // Ensure that both the files exists on disk.
                if (fs.existsSync(genXclFile) && fs.existsSync(drvXclFile)) {
                    const config = this.convertXclToDebugConfiguration(folder.uri.path, projDir, projName, configName);
                    if (config) {
                        return config;
                    }
                    errMsg = "Failed to generate launch configuration";
                } else {
                    errMsg = `${genXclFile} or ${drvXclFile} is missing.`;
                }
            } else {
                errMsg = "Missing 'ewp' or 'configuration' field in iar-vsc.json'";
            }

            return vscode.window.showInformationMessage(`Failed to launch confguration: ${errMsg}`).then(_ => {
                return undefined;	// abort launch
            });
        }

        return config;
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
    public convertXclToDebugConfiguration(wsDir: string, ewpDir: string, projName: string | undefined, configName: string | undefined): vscode.DebugConfiguration | undefined {
        if (!projName || !configName) {
            return undefined;
        }

        const baseName = projName + "." + configName;
        const genXclFile = path.resolve(ewpDir, this._settingsCatalog, baseName + this._genXcl);
        const drvXclFile = path.resolve(ewpDir, this._settingsCatalog, baseName + this._drvXcl);

        // We need both files to exist.
        if (!fs.existsSync(genXclFile) || !fs.existsSync(drvXclFile)) {
            return undefined;
        }

        return this.generateDebugConfiguration(wsDir, ewpDir, baseName, configName, this.readLinesFromXclFile(genXclFile), this.readLinesFromXclFile(drvXclFile));
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
    public generateDebugConfiguration(wsDir: string, ewpDir: string, launchName: string, configuration: string, generalCommands: string[], driverCommands: string[]): vscode.DebugConfiguration | undefined {
        // Start to assemble the configuration
        const config: vscode.DebugConfiguration = {
            "name": launchName,
            "type": "cspy",
            "request": "launch",
            "stopOnEntry": false
        };

        // The set of listed plugins (--plugins option) and regex
        const plugins: string[] = [];
        // The set of listed macros (--macros option) and regex
        const macros: string[] = [];
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
                config["driver"] = pathSegments[pathSegments.length - 1]?.replace(driverRegex, "");
            }
            if (generalCommands[2]) {
                // This is the binary. Resolve it if it's placed in the current ws.
                // Split the path into it's segments and try to find the common folder.
                const pathSegments = OsUtils.splitPath(generalCommands[2]);
                const wsDirBase = path.basename(wsDir);
                const index = pathSegments.findIndex(segment => segment === wsDirBase);

                if (index) {
                    // Add the path as a relative path.
                    config["program"] = "${workspaceFolder}" + path.sep + pathSegments.slice(index + 1).join(path.sep);
                } else {
                    // Just add it as is
                    config["program"] = generalCommands[2];
                }
            }

            // Handle the remaining arguments
            generalCommands.slice(3).forEach(arg => {
                const pluginMatch = this._pluginReg.exec(arg);
                const macroMatch = this._macroReg.exec(arg);
                if (pluginMatch && pluginMatch[1]) {
                    if (!/bat.(dll|so)$/.test(pluginMatch[1])) { // remove e.g. armbat plugin
                        plugins.push(path.parse(pluginMatch[1]).name);
                    }
                } else if (macroMatch && macroMatch[1]) {
                    macros.push(macroMatch[1]); // not tested
                } else if (this._attachReg.test(arg)) {
                    config["stopOnEntry"] = false;
                } else {
                    options.push(arg);
                }
            });
        }

        // Add the workbench options.
        config["workbenchPath"] = "${command:iar-settings.workbench}";
        config["projectPath"] = ewpDir;
        config["projectConfiguration"] = configuration;

        if (macros.length > 0) {
            config["setupMacros"] = macros;
        }


        if (plugins.length > 0) {
            config["plugins"] = plugins;
        }

        // Everything in the driver segment can be sent directly to the driverOptions segment
        config["driverOptions"] = options.concat(driverCommands);

        return config;
    }

    getVscJson(folder: vscode.WorkspaceFolder) {
        const projectFile = path.resolve(folder.uri.path, ".vscode", "iar-vsc.json");
        if (!fs.existsSync(projectFile)) {
            console.error("iar-vsc.json does not exist");
            return undefined;
        }
        return JSON.parse(fs.readFileSync(projectFile).toString());
    }

    // This method is called when dynmically adding a configuration.
    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        if (!folder) {
            // Can't do anything without a folder.
            return [];
        }

        // The json-file contains all the path to the project, which we can use to generate the path to the
        // settings catalog.
        const jsonContent = this.getVscJson(folder);
        if (!jsonContent) {
            return [];
        }

        const settingsDir = path.resolve(path.dirname(jsonContent["ewp"]), this._settingsCatalog);
        if (!fs.existsSync(settingsDir)) {
            console.error("No settings catalog is available");
            return [];
        }

        // Collect the potential targets.
        const targetXcls: string[] = [];
        fs.readdirSync(settingsDir).forEach(file => {
            const baseName = path.basename(file);
            if (baseName.endsWith(this._genXcl)) {
                targetXcls.push(baseName.replace(this._genXcl, ""));
            }
        });

        const configs: vscode.DebugConfiguration[] = [];
        targetXcls.forEach(target => {
            const filePaths = target.split(".");
            const config = this.convertXclToDebugConfiguration(folder.uri.path, path.dirname(jsonContent["ewp"]), filePaths[0], filePaths[1]);
            if (config) {
                configs.push(config);
            }
        });

        return configs;
    }
}