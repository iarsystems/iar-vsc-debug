

import { CSpyLaunchRequestArguments } from "../cspyDebug";
import { BaseConfigurationResolver, PartialSessionConfiguration } from "./baseConfigurationResolver";
import * as Path from "path";
import * as Fs from "fs";

/**
 * Attempts to create a C-SPY configuration by looking at `.xcl`
 * files in the settings directory of a project, which contain the
 * C-SPY command line arguments last used by the EW.
 */
export class XclConfigurationResolver extends BaseConfigurationResolver {

    resolveLaunchArgumentsPartial(args: CSpyLaunchRequestArguments): Promise<PartialSessionConfiguration> {

        const settingsFolder = Path.join(Path.parse(args.projectPath).dir, "settings");
        const projectName = Path.parse(args.projectPath).name;

        const programFile = Path.parse(args.program).name;
        const argsFile = Path.join(settingsFolder, `${programFile}.${args.projectConfiguration}.general.xcl`);
        const argsLines = this.readLinesFromXclFile(argsFile);
        const processorLib = argsLines[0];
        const driverLib = argsLines[1];
        if (!processorLib || !driverLib) {
            return Promise.reject(new Error(`The file seems too short: ${argsFile}`));
        }

        const options: string[] = [];
        const plugins: string[] = [];
        const macros: string[] = [];
        let attachToTarget = false;
        if (argsLines.length > 3) {
            argsLines.slice(3).forEach(arg => {
                const pluginMatch = /--plugin=(.+)$/.exec(arg);
                const macroMatch = /--macro=(.+)$/.exec(arg);
                if (pluginMatch && pluginMatch[1]) {
                    if (!/bat.(dll|so)$/.test(pluginMatch[1])) { // remove e.g. armbat plugin
                        plugins.push(Path.parse(pluginMatch[1]).name);
                    }
                } else if (macroMatch && macroMatch[1]) {
                    macros.push(macroMatch[1]); // not tested
                } else if (/\s*--attach_to_running_target\s*/.test(arg)) {
                    attachToTarget = true;
                } else {
                    console.log("Unhandled debugger argument: " + arg);
                }
                options.push(arg);
            });
        }

        const driverFile = Path.join(settingsFolder, `${projectName}.${args.projectConfiguration}.driver.xcl`);
        const driverLines = this.readLinesFromXclFile(driverFile);

        const config: PartialSessionConfiguration = {
            attachToTarget: attachToTarget,
            driverName: Path.parse(driverLib).name,
            processorName: Path.parse(processorLib).name,
            type: "simulator", // TODO: how to determine this? what does this option do?
            options: options.concat(["--backend"].concat(driverLines)),
            plugins: plugins,
            setupMacros: macros,
            target: Path.basename(Path.resolve(Path.join(Path.dirname(processorLib), "../"))),
        };

        return Promise.resolve(config);
    }

    private readLinesFromXclFile(xclPath: string): string[] {
        return Fs.readFileSync(xclPath).toString().
            split(/\r\n|\n/).
            map(this.stripQuotes).
            filter(line => line !== "");
    }

    private stripQuotes(str: string): string {
        str = str.trim();
        if (str.startsWith("\"")) {
            str = str.slice(1);
        }
        if (str.match(/[^\\]"$/)) { // ends with unescaped quote
            str = str.slice(0, -1);
        }
        return str;
    }
}