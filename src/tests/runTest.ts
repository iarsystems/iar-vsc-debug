import * as path from 'path';

import { runTests } from 'vscode-test';

async function main() {
	try {
		console.error("Starting tests");
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve('/home/power/iar-vs-code/iar-vsc-debug/');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve('/home/power/iar-vs-code/iar-vsc-debug/src/tests/suites/index.ts');

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error(err);
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
