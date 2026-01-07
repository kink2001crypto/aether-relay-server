import * as vscode from 'vscode';

export class StatusBarManager {
	private statusBarItem: vscode.StatusBarItem;
	private mobileConnected = false;

	constructor(context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		this.statusBarItem.command = 'aether.showStatus';
		this.statusBarItem.show();
		context.subscriptions.push(this.statusBarItem);

		this.setDisconnected();
	}

	setConnecting() {
		this.statusBarItem.text = '$(sync~spin) AETHER';
		this.statusBarItem.tooltip = 'Connecting to relay server...';
		this.statusBarItem.backgroundColor = undefined;
	}

	setDisconnected() {
		this.mobileConnected = false;
		this.statusBarItem.text = '$(device-mobile) AETHER';
		this.statusBarItem.tooltip = 'AETHER: Disconnected from relay server';
		this.statusBarItem.color = '#ef4444'; // Red
	}

	setConnected() {
		this.statusBarItem.text = '$(device-mobile) AETHER';
		this.statusBarItem.tooltip = 'AETHER: Connected to server';
		this.statusBarItem.color = '#10b981'; // Green
	}

	setMobileStatus(connected: boolean) {
		this.mobileConnected = connected;
		if (connected) {
			this.statusBarItem.text = '$(device-mobile) AETHER';
			this.statusBarItem.tooltip = '📱 Mobile connected';
			this.statusBarItem.color = '#10b981'; // Green
		} else {
			this.statusBarItem.text = '$(device-mobile) AETHER';
			this.statusBarItem.tooltip = 'Waiting for mobile connection...';
			this.statusBarItem.color = '#f59e0b'; // Orange/Yellow
		}
	}

	isMobileConnected(): boolean {
		return this.mobileConnected;
	}
}
