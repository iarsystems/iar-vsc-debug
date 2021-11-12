import * as vscode from "vscode";

export class MemoryDocumentProvider implements vscode.TextDocumentContentProvider {
    private readonly _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public onDidChange = this._onDidChangeEmitter.event;

    private _data: string[][] = [];
    public setData(data: string[][], uri: vscode.Uri) {
        this._data = data;
        this._onDidChangeEmitter.fire(uri);
    }

    provideTextDocumentContent(_: vscode.Uri): vscode.ProviderResult<string> {
        let content = "";
        this._data.forEach(row => {
            content += row.join("\t");
            content += "\n";
        });
        return content;
    }
}