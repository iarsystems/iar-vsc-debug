import * as path from 'path';
import { exit } from 'process';
import { CodeLensResolveRequest } from 'vscode-languageserver-protocol';
import { systemDefaultPlatform } from 'vscode-test/out/util';
import {runTestsIn, getEnvs} from '../utils/testutils/testRunner'

function printHelp(){
	console.log("Utility for running hardware tests");
	console.log("--iar-vsc=[path]   The path to the iar-vsc extension");
	console.log("--iar-dbg=[path]   The path to the iar-dbg extension.");
}

async function main() {
	if(process.argv.includes("--help")){
		printHelp()
		exit(0);
	}
	// Get the list of variables
	const envs = getEnvs();
	if(!envs["iar-vsc"] || !envs["iar-dbg"]){
		console.error("Need to provide paths to build and debug extensions")
		printHelp();
		exit(1);
	}

	// Construct the list of vsix files to install.
	var vsixFiles = [envs["iar-vsc"], envs["iar-dbg"]];
	console.log(vsixFiles.toString())

	// Run the test-suite but pass a path that does not exist to trick vs-code to not load the
	// the new-build extension.
	await runTestsIn('', 'iDontExist',path.resolve(__dirname) + '/suites/index', undefined, vsixFiles);
}

main();
