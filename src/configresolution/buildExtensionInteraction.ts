import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Functions for probing and interacting with the build extension.
 * All such interaction should go through this namespace, so we have one central place to keep e.g. file names.
 */
export namespace BuildExtensionInteraction {

    /**
     * Returns the currently selected workbench.
     */
    export function getSelectedWorkbench(folder: vscode.WorkspaceFolder): string | undefined {
        const json = getIarVscJson(folder);
        if (!json) {
            return undefined;
        }
        return json["workbench"];
    }
    /**
     * Returns the currently selected project (as an ewp file).
     */
    export function getSelectedProject(folder: vscode.WorkspaceFolder): string | undefined {
        const json = getIarVscJson(folder);
        if (!json) {
            return undefined;
        }
        return json["ewp"];
    }
    /**
     * Returns the currently selected project configuration.
     */
    export function getSelectedConfiguration(folder: vscode.WorkspaceFolder): string | undefined {
        const json = getIarVscJson(folder);
        if (!json) {
            return undefined;
        }
        return json["configuration"];
    }

    function getIarVscJson(folder: vscode.WorkspaceFolder) {
        const projectFile = path.join(folder.uri.fsPath, ".vscode", "iar-vsc.json");
        if (!fs.existsSync(projectFile)) {
            console.error(projectFile + " does not exist");
            return undefined;
        }
        return JSON.parse(fs.readFileSync(projectFile).toString());
    }
}