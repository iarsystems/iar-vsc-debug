/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { MemoryDocumentProvider } from './memoryDocumentProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log("activating");
	// register a configuration provider for 'mock' debug type TODO:
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mock', new MockConfigurationProvider()));


	let memoryDocumentProvider: MemoryDocumentProvider = new MemoryDocumentProvider;
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("memory", memoryDocumentProvider));
	context.subscriptions.push(vscode.debug.onDidStartDebugSession(async () => {
			// TODO: should probably not open automatically (maybe add a setting for it)
		const memoryDocument = await vscode.workspace.openTextDocument(vscode.Uri.parse("memory:Symbolic Memory.iarmem"));
		await vscode.window.showTextDocument(memoryDocument, { preview: false, preserveFocus: true, viewColumn: vscode.ViewColumn.Three });
	}));

	context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e: vscode.DebugSessionCustomEvent) => {
		if (e.event === "memory") {
			memoryDocumentProvider.data = e.body;
		}
	}));
}

export function deactivate() {
	// nothing to do
}

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
				config.type = 'mock';
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

export class EnviromentProvider{

	public setPosition(){
	// 	let editor = vscode.window.activeTextEditor;
	// 	if (editor) {
	// 		editor.document.positionAt(23);
	// 		 console.log("position....");
	//    }
	console.log("position....");
	}
}

