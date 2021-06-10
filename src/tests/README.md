# Integration test suite for the iar-vsc-debug plugins

These are the intergration tests for the debugger implementation for C-SPY to VS-Code. The tests launches a vscode environment to which commands should be passed using vscode interface defined in node_modules/@types/vscode/index.d.ts.

The test-suite can be executed from within vscode using the "Run Extension Tests"-configuration of from the commands line using the command "node ./out/tests/runTest.js" in the same folder as the package.json file.

A small set of testproject are placed in the TestProjects folder.

## Writing a new test.
