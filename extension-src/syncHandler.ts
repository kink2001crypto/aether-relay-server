/**
 * 🌐 Sync Handler - Server-Only
 */

import * as vscode from 'vscode';
import * as path from 'path';

// 🌐 SERVER URL
const SERVER_URL = 'https://aether-relay-server-production.up.railway.app';

interface SyncEvent {
	type: string;
	data: any;
}

export class SyncHandler {
	private serverUrl: string;

	constructor(serverUrl?: string) {
		this.serverUrl = serverUrl || SERVER_URL;
	}

	setServerUrl(url: string) {
		this.serverUrl = url;
	}

	async handleEvent(event: SyncEvent) {
		console.log('📨 Event:', event.type);

		switch (event.type) {
			case 'file:apply':
				await this.applyCode(event.data);
				break;
			case 'terminal:exec':
				await this.executeTerminal(event.data);
				break;
			case 'file:delete':
				await this.deleteFile(event.data);
				break;
			case 'folder:delete':
				await this.deleteFolder(event.data);
				break;
			case 'git:status':
				await this.gitStatus(event.data);
				break;
			case 'git:commit':
				await this.gitCommit(event.data);
				break;
			case 'git:push':
				await this.gitPush(event.data);
				break;
		}
	}

	private async applyCode(data: { path: string; content: string; projectPath: string }) {
		try {
			const filePath = path.join(data.projectPath, data.path);
			const uri = vscode.Uri.file(filePath);

			await vscode.workspace.fs.writeFile(uri, Buffer.from(data.content, 'utf-8'));

			// Open the file
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			// Send success response
			await this.sendResponse('file:applied', { success: true, path: data.path });

			vscode.window.showInformationMessage(`✅ Applied: ${data.path}`);
		} catch (error: any) {
			await this.sendResponse('file:applied', { success: false, error: error.message });
			vscode.window.showErrorMessage(`❌ Failed to apply: ${error.message}`);
		}
	}

	private async executeTerminal(data: { command: string; projectPath?: string }) {
		const terminal = vscode.window.createTerminal({
			name: 'AETHER',
			cwd: data.projectPath
		});
		terminal.show();
		terminal.sendText(data.command);
	}

	private async deleteFile(data: { filePath: string; projectPath: string }) {
		try {
			const fullPath = path.join(data.projectPath, data.filePath);
			const uri = vscode.Uri.file(fullPath);
			await vscode.workspace.fs.delete(uri);
			await this.sendResponse('delete:result', { success: true, path: data.filePath });
		} catch (error: any) {
			await this.sendResponse('delete:result', { success: false, error: error.message });
		}
	}

	private async deleteFolder(data: { folderPath: string; projectPath: string }) {
		try {
			const fullPath = path.join(data.projectPath, data.folderPath);
			const uri = vscode.Uri.file(fullPath);
			await vscode.workspace.fs.delete(uri, { recursive: true });
			await this.sendResponse('delete:result', { success: true, path: data.folderPath });
		} catch (error: any) {
			await this.sendResponse('delete:result', { success: false, error: error.message });
		}
	}

	private async gitStatus(data: { projectPath: string }) {
		// Git status handled by VS Code Git extension
	}

	private async gitCommit(data: { projectPath: string; message: string }) {
		// Git commit handled by VS Code Git extension
	}

	private async gitPush(data: { projectPath: string }) {
		// Git push handled by VS Code Git extension
	}

	private async sendResponse(event: string, data: any) {
		try {
			await fetch(`${this.serverUrl}/api/sync/relay-response`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ event, data })
			});
		} catch (error) {
			console.error('Failed to send response:', error);
		}
	}
}
