import { Socket } from 'net'
import { writeFileSync } from 'fs';

/**
 * Function to call when a response is received from the CSpyRuby server
 */
type CSpyCallback = (cspyResponse: any) => void;

/**
 * Handles communication to a TCP server running CSpyRuby
 */
export class CSpyRubyServer {
	private client = new Socket();

	private callbacks: CSpyCallback[] = [];

	constructor() {
		const newLocal = this;
		this.client.connect(28561, '127.0.0.1', function() {
			newLocal.client.on('data', function(data) {
				var ab2str = require('arraybuffer-to-string');
				let response = null;
				try {
					response = JSON.parse(ab2str(data));
				} catch(e) {
					CSpyRubyServer.log("unable to parse json (["+ data +"])<#------------------<< "+ e);
				}
				if (response) {
					const callback = newLocal.callbacks[response["command"]];
					if (callback) {
						const body = "body" in response ? response["body"] : "";
						callback(body);
					}
				}
			});
		});
	}

	/** Sends a command with the given body to the ruby server, and runs the callback once the server replies */
	sendCommandWithCallback(command: string, body: any, callback: CSpyCallback): void {
		this.callbacks[command] = callback; // support multiple callbacks of same type? not sure if DAP is synchronous or not
		const request = {
			command: command,
			body: body,
		};
		const reqString = JSON.stringify(request);
		this.client.write(reqString + '\n');
	}

    public static log(msg: string) {
        writeFileSync(__dirname + "debug_adapter.log", msg + "\n", { flag: 'a' });
    }

}