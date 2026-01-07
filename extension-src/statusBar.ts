/**
 * 📊 Status Bar Manager
 */

import * as vscode from 'vscode';

export class StatusBarManager {
	private _statusBarItem: vscode.StatusBarItem;
	private _connected: boolean = false;

	constructor() {
		this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this._statusBarItem.command = 'aether.showStatus';
		this.setDisconnected();
		this._statusBarItem.show();
	}

	setConnecting() {
		this._statusBarItem.text = '$(sync~spin) AETHER...';
		this._statusBarItem.backgroundColor = undefined;
	}

	setConnected() {
		this._connected = true;
		this._statusBarItem.text = '$(check) AETHER';
		this._statusBarItem.backgroundColor = undefined;
	}

	setDisconnected() {
		this._connected = false;
		this._statusBarItem.text = '$(x) AETHER';
		this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
	}

	isConnected(): boolean {
		return this._connected;
	}

	dispose() {
		this._statusBarItem.dispose();
	}
}
