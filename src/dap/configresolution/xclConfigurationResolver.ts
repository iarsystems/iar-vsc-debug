'use strict';

import { CSpyLaunchRequestArguments } from "../cspyDebug";
import { SessionConfiguration } from "../thrift/bindings/cspy_types";
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
        ///
        /// This can be worked on _a lot_ to support every possible command line argument.
        /// See p.52 here: http://ftp.iar.se/WWWfiles/arm/webic/doc/EWARM_DebuggingGuide.ENU.pdf
        ///

        const settingsFolder = Path.join(Path.parse(args.projectPath).dir, "settings");
        const projectName = Path.parse(args.projectPath).name;

        const argsFile = Path.join(settingsFolder, `${projectName}.${args.projectConfiguration}.general.xcl`);
        const argsLines = Fs.readFileSync(argsFile).toString()
                                .split(/\r\n|\n/)
                                .map(this.stripQuotes)
                                .filter(line => line !== "");
        const processorLib = argsLines[0];
        const driverLib = argsLines[1];

        let options: string[] = [];
        let plugins: string[] = [];
        let macros: string[] = [];
        let attachToTarget = false;
        if (argsLines.length > 3) {
            argsLines.slice(3).forEach(arg => {
                const pluginMatch = /--plugin=(.+)$/.exec(arg);
                const macroMatch = /--macro=(.+)$/.exec(arg);
                if (pluginMatch) {
                    plugins.push(Path.parse(pluginMatch[1]).name);
                } else if (macroMatch) {
                    plugins.push(macroMatch[1]); // not tested
                } else if (/\s*--attach_to_running_target\s*/.test(arg)) {
                    attachToTarget = true;
                } else {
                    console.log("Unhandled debugger argument: " + arg);
                }
                options.push(arg);
            });
        }

        const driverFile = Path.join(settingsFolder, `${projectName}.${args.projectConfiguration}.driver.xcl`);
        const driverLines = Fs.readFileSync(driverFile).toString()
                                .split(/\r\n|\n/)
                                .map(this.stripQuotes)
                                .filter(line => line !== "");

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