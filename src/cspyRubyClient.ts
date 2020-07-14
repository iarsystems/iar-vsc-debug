import { Socket } from 'net'
import { writeFileSync } from 'fs';

/**
 * Function to call when a response is received from the CSpyRuby server
 */
type CSpyCallback = (cspyResponse: any) => void;

/**
 * Handles communication to a TCP server running CSpyRuby
 */
export class CSpyRubyClient {
	private client = new Socket();
	private seq = 0;

	private callbacks: CSpyCallback[][] = [];

	constructor() {
		const newLocal = this;
		// this.client.connect(28561, '127.0.0.1', function() {
		// 	newLocal.client.on('data', function(data) {
		// 		var ab2str = require('arraybuffer-to-string');
		// 		ab2str(data).split("\n").filter(l => l !== "").forEach((line: string) => {
		// 			let response = null;
		// 			try {
		// 				response = JSON.parse(line);
		// 			} catch(e) {
		// 				CSpyRubyClient.log("unable to parse json (["+ line +"])<#------------------<< "+ e);
		// 			}
		// 			if (response) {
		// 				CSpyRubyClient.log(ab2str(line));
		// 				// TODO: maybe remove callback after it is used?
		// 				const callback = newLocal.callbacks[response["command"]][response["seq"]];
		// 				if (callback != null) {
		// 					const body = "body" in response ? response["body"] : "";
		// 					callback(body);
		// 				}
		// 			}
		// 		});
		// 	});
		// });
	}

	/** Sends a command with the given body to the ruby server, and runs the callback once the server replies */
	sendCommandWithCallback(command: string, body: any, callback: CSpyCallback): void {
		if (!this.callbacks[command]) {
			this.callbacks[command] = [];
		}
		this.callbacks[command][this.seq] = callback;
		const request = {
			command: command,
			seq: this.seq++,
			body: body,
		};
		const reqString = JSON.stringify(request);
		CSpyRubyClient.log("sending request: " + reqString);
		// this.client.write(reqString + '\n');
	}

	// There's no particular reason this function is in this file/class
    public static log(msg: string) {
		console.log(msg);
        writeFileSync(__dirname + "/debug_adapter.log", msg + "\n", { flag: 'a' });
    }

}