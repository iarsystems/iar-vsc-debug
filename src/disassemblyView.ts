import * as vscode from 'vscode'

/**
 * Displays a disassembly window as a virtual text document.
 * Supports marking breakpoint and PC location(s)
 */
export class DisassemblyView {
    private _documentProvider = new DisassemblyDocumentProvider();
    private _editor: vscode.TextEditor; // The editor containing out disassembly document

    private _content: string[] = [];
    private _bps: number[] = [];
    private _pcRow: number | undefined = undefined;

    private readonly _bpDecorator = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(255, 0, 0, 0.15)", isWholeLine: true, overviewRulerColor: '#880000', overviewRulerLane: vscode.OverviewRulerLane.Right
    });
    private readonly _curPosDecorator = vscode.window.createTextEditorDecorationType({
        backgroundColor: "rgba(0, 255, 0, 0.2)", isWholeLine: true, overviewRulerColor: '#00aa00', overviewRulerLane: vscode.OverviewRulerLane.Center
    });


    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("disasm", this._documentProvider));

        // We need to make sure we update the decorations _after_ the document content has been changed.
        // If we call updateDecorations immediately after updateContent, we will set the decorations on the old
        // content, before VS Code has a chance to update the content of the actual document.
        // Then, VS Code will move the decorations when updating the document.
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) =>{
            if (this._editor && e.document == this._editor.document) {
                // TODO: might be a good idea to call this._editor.revealRange to make sure PC line is visible
                this.updateDecorations();
            }
        }));
        // Make sure to reapply decorations when we switch back to this editor
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) =>{
            if (this._editor && e && e.document == this._editor.document) {
                this._editor = e;
                this.updateDecorations();
            }
        }));
    }

    async open() {
        const disasmDocument = await vscode.workspace.openTextDocument(vscode.Uri.parse("disasm:Disassembly.asm"));
        this._editor = await vscode.window.showTextDocument(disasmDocument, { preview: false, preserveFocus: true, viewColumn: vscode.ViewColumn.Three });
        this.updateContent();
    }

    setData(content: string[], breakpointRows: number[], pcRow: number | undefined) {
        this._bps = breakpointRows;
        this._pcRow = pcRow;
        if (this._content.join() != content.join()) {
            this._content = content;
            if (this._editor) this.updateContent();
        } else {
            console.log("No change in content, updating decorations");
            this.updateDecorations();
        }
    }

    private updateContent() {
        this._documentProvider.setData(this._content, this._editor.document.uri);
    }

    private updateDecorations() {
        // TODO: check if _editor is set before doing anything
        const bpDecorations: vscode.DecorationOptions[] = [];
        this._bps.forEach((row: number) => {
            const range = new vscode.Range(new vscode.Position(row, 0), new vscode.Position(row, 1));
            bpDecorations.push({ range: range, hoverMessage: "*breakpoint*" })
        });
        this._editor.setDecorations(this._bpDecorator, bpDecorations);

        if (this._pcRow) {
            this._editor.setDecorations(this._curPosDecorator, [
                { range: new vscode.Range(new vscode.Position(this._pcRow, 0), new vscode.Position(this._pcRow, 0)), hoverMessage: "PC" }
            ]);
        } else {
            this._editor.setDecorations(this._curPosDecorator, []);
        }
    }

    setPcRow(row: number) {
    }
}

/**
 * Provides the disasm content to VS Code
 */
class DisassemblyDocumentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public onDidChange = this._onDidChangeEmitter.event;

    private _data: string[] = [];
    public setData(data: string[], uri: vscode.Uri) {
        this._data = data;
        this._onDidChangeEmitter.fire(uri);
    }

    // content returned here is rendered
    provideTextDocumentContent(_: vscode.Uri): vscode.ProviderResult<string> {
        let content = "";
        content += this._data.join('\n');
        return content;
    }
}