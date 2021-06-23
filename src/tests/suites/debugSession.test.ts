import assert = require('assert');
import mocha = require('mocha')
import * as Path from 'path';
import {CSpyLaunchRequestArguments} from '../../dap/cspyDebug';
import * as vscode from 'vscode';
import {DebugClient} from 'vscode-debugadapter-testsupport';
import { TestUtils } from './testUtils';
import { DebugSession } from 'vscode-debugadapter';


/*
suite("Tests", function() {
    const DEBUGGER = './out/dap/cspyDebug.js';
	const PROJECT_ROOT = Path.join(__dirname, '../../../');
	const DATA_ROOT = Path.join(PROJECT_ROOT, 'src/tests/data/');

    // This is the DAP protocol keeper which one can use
	let debugClient: DebugClient;

    // Setup and start the client. This will not launch the session.
    setup(async () => {
        //debugClient = new DebugClient('node', DEBUGGER, 'cspy');
		//return debugClient.start();
    });


    const launchArgs:CSpyLaunchRequestArguments = {
    program: Path.join(PROJECT_ROOT,"samples","GettingStarted","Debug","Exe","BasicDebugging.out"),
    workbenchPath: "/home/power/ewarm-master/StageLinux_x86_64/Release",
    projectPath: Path.join(PROJECT_ROOT,"samples","GettingStarted"),
    projectConfiguration: "Debug",
    driverLib: "SIM2",
    driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting", "--multicore_nr_of_cores=1"],
    stopOnEntry:true
    }

    suite("Launching a debugsession", ()=>{
        test("Initialize-request", ()=>{
            return debugClient.initializeRequest().then((response)=>{
                assert.ok(response.body?.supportsConfigurationDoneRequest);
                assert.ok(response.body?.supportsSetVariable);
            })
        });

        test("Launch-request", ()=>{
            return debugClient.launch(launchArgs).then(()=>{
                debugClient.terminateRequest()
            });
        });
    });



});*/


suite("New tests", () =>{
	const PROJECT_ROOT = Path.join(__dirname, '../../../');
	const DATA_ROOT = Path.join(PROJECT_ROOT, 'src/tests/data/');

    const dbgConfig:vscode.DebugConfiguration = {
        type: 'cspy',
        request: 'launch',
        name: 'Test',
        program: Path.join(PROJECT_ROOT,"samples","GettingStarted","Debug","Exe","BasicDebugging.out"),
        workbenchPath: "/home/power/ewarm-master/StageLinux_x86_64/Release",
        projectPath: Path.join(PROJECT_ROOT,"samples","GettingStarted"),
        projectConfiguration: "Debug",
        driverLib: "SIM2",
        driverOptions: ["--endian=little", "--cpu=ARM7TDMI", "--fpu=None", "--semihosting", "--multicore_nr_of_cores=1"],
        stopOnEntry:true
    }

    var activeSession : vscode.DebugSession;

    vscode.debug.onDidStartDebugSession((session)=>{
        activeSession = session;
    });

    mocha.beforeEach(()=>{
        return vscode.debug.startDebugging(undefined,dbgConfig).then((response)=>{
            assert.strictEqual(response,true);
        });
    })

    mocha.afterEach( ()=>{
        return activeSession.customRequest('terminate').then(()=>{
            vscode.debug.stopDebugging(activeSession);
        })
    })

    test("Test launch", ()=>{
        return TestUtils.assertCurrentLineIs(activeSession,"",43,1);
    })


    test("Test step",()=>{
        return TestUtils.assertCurrentLineIs(activeSession,"",43,1).then(()=>{
            console.log("Stepping");
            activeSession.customRequest('next',{granularity: ""}).then(()=>{
                TestUtils.assertCurrentLineIs(activeSession,"",45,1)
            })
        })
    })

});