import * as vscode from 'vscode'

export class MemoryDocumentProvider implements vscode.TextDocumentContentProvider {
	private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	public onDidChange = this._onDidChangeEmitter.event;

	private thisUri: vscode.Uri;

	private _data: string[][] = [];
	public set data(data: string[][]) {
		this._data = data;
		this._onDidChangeEmitter.fire(this.thisUri);
	}

	provideTextDocumentContent(uri: vscode.Uri): vscode.ProviderResult<string> {
		this.thisUri = uri;
		let content = "";
		this._data.forEach(row => {
			content += row.join('\t');
			content += '\n';
		});
		return content;
	}
}