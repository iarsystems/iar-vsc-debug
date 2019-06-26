import * as vscode from 'vscode'

export class MemoryDocumentProvider implements vscode.TextDocumentContentProvider {
	provideTextDocumentContent(uri: vscode.Uri): vscode.ProviderResult<string> {
		return vscode.debug.activeDebugSession!!.customRequest("memory").then((response: string[][]) => {
			let content = "";
			response.forEach(row => {
				content += row.join('\t');
				content += '\n';
			});
			return content;
		});
	}
}