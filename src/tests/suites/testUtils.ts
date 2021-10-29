

import assert = require('assert')
import * as vscode from 'vscode';
import * as Path from 'path';
import { IarOsUtils } from '../../utils/osUtils';
import { spawn, spawnSync } from 'child_process';

/**
 *  Class contaning utility methods for the tests.
 */

export namespace TestUtils {
	export const PROJECT_ROOT = Path.join(__dirname, '../../../');

	function patchEwp(ewpPath:string, target:string){

	}

	// Gets a list of paths to available ews, either from user settings or from an env variable set by the test runner
	export function getEwPaths() {
        const installDirs = vscode.workspace.getConfiguration("iarvsc").get<string[]>("iarInstallDirectories");
		if (installDirs) {
			return installDirs;
		}
		return JSON.parse(process.env.ewPaths || "[]");
	}

	export function buildProject(workbenchPath: string, ewpPath: string, configuration: string) {
		const iarBuildPath = Path.join(workbenchPath, "common/bin/iarbuild" + IarOsUtils.executableExtension());
		console.log("Building " + ewpPath);
		spawnSync(iarBuildPath, [ewpPath, "-build", configuration]);
		// console.log(spawnSync(iarBuildPath, [ewpPath, "-build", configuration]).stdout.toString());
	}

	export function assertCurrentLineIs(session: vscode.DebugSession, path: string, line: number, column: number){
		return session.customRequest('stackTrace').then((response)=>{
			console.log("Checking stack");
			if(response.stackFrames)
			{
				let currentStack = response.stackFrames[0];
				assert.strictEqual(currentStack.line,line,`Wrong line: expected ${line} got ${currentStack.line}`);
				assert.strictEqual(currentStack.column,column,`Wrong column: expected ${column} got ${currentStack.column}`);
			}
		});
	}

    export function wait(time: number) {
        return new Promise((resolve, _) => {
            setTimeout(resolve, time);
        });
    }
}