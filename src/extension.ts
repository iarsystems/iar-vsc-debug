/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { MemoryDocumentProvider } from './memoryDocumentProvider';
import { DisassemblyView } from './disassemblyView';

export function activate(context: vscode.ExtensionContext) {
	console.log("activating");
	// register a configuration provider for 'cspy' debug type
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('cspy', new MockConfigurationProvider()));

	// register commands to be called when pressing instruction step buttons
	context.subscriptions.push(vscode.commands.registerCommand("iar.stepOverInstruction", () => {
		vscode.debug.activeDebugSession!!.customRequest("istepOver"); //TODO: avoid coercing activeDebugSession
	}));
	context.subscriptions.push(vscode.commands.registerCommand("iar.stepIntoInstruction", () => {
		vscode.debug.activeDebugSession!!.customRequest("istepInto"); //TODO: avoid coercing activeDebugSession
	}));

	let memoryDocumentProvider = new MemoryDocumentProvider();
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("memory", memoryDocumentProvider));
	let disasmView: DisassemblyView = new DisassemblyView(context);

	context.subscriptions.push(vscode.debug.onDidStartDebugSession(async () => {
		// TODO: should probably not open automatically (maybe add a setting for it)
		const memoryDocument = await vscode.workspace.openTextDocument(vscode.Uri.parse("memory:Symbolic Memory.iarmem"));
		await vscode.window.showTextDocument(memoryDocument, { preview: false, preserveFocus: true, viewColumn: vscode.ViewColumn.Three });
		disasmView.open();
	}));

	// Note: sometimes, VS Code calls this handler before onDidStartDebugSession
	context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e: vscode.DebugSessionCustomEvent) => {
		if (e.event === "memory") {
			memoryDocumentProvider.setData(e.body, vscode.Uri.parse("memory:Symbolic Memory.iarmem"));
		} else if (e.event === "disassembly") {
			disasmView.setData(e.body.disasm, e.body.bp_rows, e.body.cur_row >= 0 ? e.body.cur_row : undefined);
		}
	}));
}

export function deactivate() {
	// nothing to do
}

// TODO: change to c-spy
class MockConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'c' ) {
				config.type = 'cspy';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined;	// abort launch
			});
		}



		return config;
	}
}