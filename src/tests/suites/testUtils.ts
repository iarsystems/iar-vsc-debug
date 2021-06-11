

import assert = require('assert')
import * as vscode from 'vscode';
import { DebugSession, StackFrame } from 'vscode-debugadapter';

/**
 *  Class contaning utility methods for the tests.
 */

export class TestUtils{

	private static patchEwp(ewpPath:string, target:string){

	}

	static buildProject(ewpPath:string, target:string){

	}

	static assertCurrentLineIs(session: vscode.DebugSession, path: string, line: number, column: number){
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
}