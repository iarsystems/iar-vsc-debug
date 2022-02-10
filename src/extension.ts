

import * as vscode from "vscode";
import { CSpyDebugSession, CSpyLaunchRequestArguments } from "./dap/cspyDebug";
import { DebugSessionTracker } from "./debugSessionTracker";
import { BreakpointCommands } from "./breakpointCommands";
import { CSpyConfigurationResolver } from "./configresolution/cspyConfigurationResolver";
import { CSpyConfigurationsProvider } from "./configresolution/cspyConfigurationsProvider";
import { SettingsConstants } from "./settingsConstants";
import { BreakpointType } from "./dap/breakpoints/cspyBreakpointManager";
import { tmpdir } from "os";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import * as fsProm from "fs/promises";
import { SvdGenerator } from "./svdGenerator";

let sessionTracker: DebugSessionTracker | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log("activating");
    // register a configuration provider for 'cspy' debug type
    vscode.debug.registerDebugAdapterDescriptorFactory("cspy", {
        createDebugAdapterDescriptor(_session: vscode.DebugSession, _executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
            return new vscode.DebugAdapterInlineImplementation(new CSpyDebugSession());
        }
    });

    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", new CSpyConfigurationsProvider(), vscode.DebugConfigurationProviderTriggerKind.Initial));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", new CSpyConfigurationsProvider(), vscode.DebugConfigurationProviderTriggerKind.Dynamic));
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("cspy", CSpyConfigurationResolver.getInstance()));

    sessionTracker = new DebugSessionTracker(context);
    BreakpointCommands.registerCommands(context, sessionTracker);
    CSpyConfigurationResolver.getInstance().addModifier(config => {
        // Pass along the user's selection of breakpoint type to the adapter
        // Allow overriding the user setting from launch.json, even if we don't advertise that possibility anywhere
        if (!config["breakpointType"]) {
            const bpType = vscode.workspace.getConfiguration(SettingsConstants.MAIN_SECTION).get(SettingsConstants.BREAKPOINT_TYPE);
            const actualType = bpType === SettingsConstants.BreakpointTypeValues.HARDWARE ? BreakpointType.HARDWARE :
                bpType === SettingsConstants.BreakpointTypeValues.SOFTWARE ? BreakpointType.SOFTWARE : BreakpointType.AUTO;
            config["breakpointType"] = actualType;
        }
    });

    // Generate and locate an svd for the session, so that the register view is populated
    CSpyConfigurationResolver.getInstance().addModifier(async(config) => {
        if (!config["svdFile"]) {
            // Create a file name based on the configuration. If it exists, we've already generated an svd for this config.
            const outPath = path.join(tmpdir(), "iar-vsc-svd", crypto.createHash("md5").update(JSON.stringify(config)).digest("hex") + ".svd");
            if (!fs.existsSync(outPath)) {
                await fsProm.mkdir(path.dirname(outPath), {recursive: true});
                // This cast is a little dirty, but vs code should alert the user if the debug config is not complete.
                const svdData = await SvdGenerator.generateSvd(config as unknown as CSpyLaunchRequestArguments);
                await fsProm.writeFile(outPath, SvdGenerator.toSvdXml(svdData));
            }
            config["svdFile"] = outPath;
        }
    });
}

export function deactivate() {
    // nothing to do
}
