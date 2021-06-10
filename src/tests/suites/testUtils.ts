
import * as Path from "path";
import {DebugClient} from 'vscode-debugadapter-testsupport'
import assert = require('assert')

/**
 *  Class contaning utility methods for the tests.
 */

export class TestUtils{

	private static patchEwp(ewpPath:string, target:string){

	}

	static buildProject(ewpPath:string, target:string){

	}

	static assertStackIs(client: DebugClient, path: string, line: number, column: number){
		console.log('Checking stack');
		return client.stackTraceRequest({threadId: 0}).then((stack)=>{
			const frame = stack.body.stackFrames[0];
			if(frame.source?.path){
				// Only check if available.
				assert.ok(frame.source.path.includes(path),'');
			}
            assert.strictEqual(frame.line, line, 'stopped location: line mismatch');
            assert.strictEqual(frame.column, column, 'stopped location: column mismatch');
            return stack;
		})
	}
}