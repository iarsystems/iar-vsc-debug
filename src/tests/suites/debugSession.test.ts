import * as Assert from "assert";
import * as Path from "path";
import * as vscode from "vscode";
import { TestUtils } from "./testUtils";
import { TestSandbox } from "../../utils/testutils/testSandbox";


/**
 * Tests against a full debug session started from vs code.
 * Testing this way is a bit clumsy, since there are limits to what information we can
 * probe for from the vs code api. For example, after stepping or running, we can't know
 * when the debugger has stopped again, we instead just have to wait.
 *
 * An improvement would be to have the debug adapter support multiple clients at the
 * same time. Then we could have vs code connect to it, and also have a DebugClient
 * instance to use for e.g. waiting for events. However, the debug adapter currently only
 * supports having one client at a time.
 */
suite("New tests", () =>{

    const dbgConfig: vscode.DebugConfiguration = {
        type: "cspy",
        request: "launch",
        name: "C-SPY Debugging Tests",
        projectConfiguration: "Debug",
        driverLib: "armsim2",
        driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting", "--multicore_nr_of_cores=1"],
        stopOnEntry:true
    };

    let activeSession: vscode.DebugSession;
    const sandbox = new TestSandbox(TestUtils.PROJECT_ROOT);
    let testProjectsPath: string;

    vscode.debug.onDidStartDebugSession((session)=>{
        activeSession = session;
    });

    suiteSetup(() => {
        testProjectsPath = sandbox.copyToSandbox(Path.join(TestUtils.PROJECT_ROOT, "src/tests/TestProjects/"));

        dbgConfig["projectPath"] = Path.join(testProjectsPath, "GettingStarted/BasicDebugging.ewp");
        dbgConfig["program"] = Path.join(testProjectsPath, "GettingStarted/Debug/Exe/BasicDebugging.out");

        const installDirs = TestUtils.getEwPaths();
        Assert(installDirs, "No workbenches found to use for debugging");
        // For now just use the first entry, and assume it points directly to a top-level ew directory
        const workbench = installDirs[0];

        dbgConfig["workbenchPath"] = workbench;
        TestUtils.buildProject(dbgConfig["workbenchPath"], dbgConfig["projectPath"], dbgConfig["projectConfiguration"]);
    });

    setup(async()=>{
        await vscode.debug.startDebugging(undefined, dbgConfig);
        await TestUtils.wait(1000);

    });

    teardown(async()=>{
        await vscode.debug.stopDebugging(activeSession);
    });

    test("Test launch", async()=>{
        await TestUtils.assertCurrentLineIs(activeSession, "", 43, 1);
    });


    test("Test step", async()=>{
        await TestUtils.assertCurrentLineIs(activeSession, "", 43, 1);
        await activeSession.customRequest("next", {granularity: ""});
        await TestUtils.wait(1000);
        TestUtils.assertCurrentLineIs(activeSession, "", 45, 1);
    });

});