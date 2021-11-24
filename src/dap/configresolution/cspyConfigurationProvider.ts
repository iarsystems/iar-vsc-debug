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
    private constructor() {}

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
    resolveDebugConfiguration(_folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, _token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === "c") {
                config.type = "cspy";
                config.name = "Launch";
                config.request = "launch";
                config["program"] = "${file}";
                config["stopOnEntry"] = true;
            }
        }

        if (!config["program"]) {
            return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
                return undefined;	// abort launch
            });
        }

        return config;
    }

    private convertXclToDebugConfiguration(wsDir: string, ewpDir: string, baseName: string): vscode.DebugConfiguration | undefined {
        const genXclFile = path.resolve(ewpDir, this._settingsCatalog, baseName + this._genXcl);
        const dbgXclFile = path.resolve(ewpDir, this._settingsCatalog, baseName + this._drvXcl);

        // We need both files to exist.
        if (!fs.existsSync(genXclFile) || !fs.existsSync(dbgXclFile)) {
            return undefined;
        }

        // Start to assemble the configuration
        const config: vscode.DebugConfiguration = {
            "name": baseName,
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
        const commands = this.readLinesFromXclFile(genXclFile);
        if (commands.length < 3) {
            console.error("To few entries in the file, Corrupt?");
        } else {
            if (commands[1]) {
                const pathSegments = OsUtils.splitPath(commands[1]);
                const noSegments = pathSegments.length;
                // The target is listed before bin.
                const target = pathSegments[noSegments - 3];
                config["target"] = target;
                // The driver is given as libarmsim2.so or armsim2.dll so remove
                // the target name and any extensions
                const driverRegex = new RegExp(`(lib|.so|.dll|${target})`, "g");
                config["driver"] = pathSegments[pathSegments.length - 1]?.replace(driverRegex, "");
            }
            if (commands[2]) {
                // This is the binary. Resolve it if it's placed in the current ws.
                // Split the path into it's segments and try to find the common folder.
                const pathSegments = OsUtils.splitPath(commands[2]);
                const wsDirBase = path.basename(wsDir);
                const index = pathSegments.findIndex(segment => segment === wsDirBase);

                if (index) {
                    // Add the path as a relative path.
                    config["program"] = "${workspaceFolder}" + path.sep + pathSegments.slice(index).join(path.sep);
                } else {
                    // Just add it as is
                    config["program"] = commands[2];
                }
            }

            // Handle the remaining arguments
            commands.slice(3).forEach(arg => {
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
        config["projectConfiguration"] = baseName.split(".")[1];

        // Everything in the driver segment can be sent directly to the driverOptions segment
        config["driverOptions"] = options.concat(this.readLinesFromXclFile(dbgXclFile));

        return config;
    }


    // This method is called when dynmically adding a configuration.
    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        if (!folder) {
            // Can't do anything without a folder.
            return [];
        }
        // Start by looking for the iar-vsc.json file as it contains the information that we need about the
        // current project.
        const projectFile = path.resolve(folder.uri.path, ".vscode", "iar-vsc.json");
        if (!fs.existsSync(projectFile)) {
            console.error("iar-vsc.json does not exist");
            return [];
        }

        // The json-file contains all the path to the project, which we can use to generate the path to the
        // settings catalog.
        const jsonContent = JSON.parse(fs.readFileSync(projectFile).toString());
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
            const config = this.convertXclToDebugConfiguration(folder.uri.path, path.dirname(jsonContent["ewp"]), target);
            if (config) {
                configs.push(config);
            }
        });

        return configs;
    }
}