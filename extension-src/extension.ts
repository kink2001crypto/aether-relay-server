/**
 * 🌐 AETHER Extension - Server-Only
 * Connect to Railway server, no localhost
 */

import * as vscode from 'vscode';
import { SyncHandler } from './syncHandler';
import { MobileProjectsProvider } from './mobileProjects';
import { ChatPanelProvider } from './chatPanel';
import { StatusBarManager } from './statusBar';

// 🌐 SERVER URL - Railway only
const SERVER_URL = 'https://aether-relay-server-production.up.railway.app';

let syncHandler: SyncHandler;
let mobileProjectsProvider: MobileProjectsProvider;
let chatPanelProvider: ChatPanelProvider;
let statusBarManager: StatusBarManager;
let pollingInterval: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('🚀 AETHER Extension starting...');

	// Initialize handlers with server URL
	syncHandler = new SyncHandler(SERVER_URL);
	mobileProjectsProvider = new MobileProjectsProvider(context);
	mobileProjectsProvider.setServerUrl(SERVER_URL);
	chatPanelProvider = new ChatPanelProvider(context);
	statusBarManager = new StatusBarManager();

	// Register tree view
	vscode.window.registerTreeDataProvider('aetherMobileProjects', mobileProjectsProvider);

	// Register webview
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('aether.chatPanel', chatPanelProvider)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('aether.connect', connect),
		vscode.commands.registerCommand('aether.disconnect', disconnect),
		vscode.commands.registerCommand('aether.syncProject', () => mobileProjectsProvider.syncCurrentProject()),
		vscode.commands.registerCommand('aether.addProject', () => mobileProjectsProvider.addCurrentProject()),
		vscode.commands.registerCommand('aether.removeProject', (item) => mobileProjectsProvider.removeProject(item)),
		vscode.commands.registerCommand('aether.refreshProjects', () => mobileProjectsProvider.refresh()),
		vscode.commands.registerCommand('aether.clearProjects', () => mobileProjectsProvider.clearAllProjects()),
		vscode.commands.registerCommand('aether.showStatus', showStatus),
		vscode.commands.registerCommand('aether.openChat', () => chatPanelProvider.show())
	);

	// Auto-connect on startup
	connect();
}

async function connect() {
	try {
		statusBarManager.setConnecting();

		const response = await fetch(`${SERVER_URL}/api/sync/status`, {
			headers: { 'ngrok-skip-browser-warning': 'true' }
		});

		if (response.ok) {
			statusBarManager.setConnected();
			syncHandler.setServerUrl(SERVER_URL);
			mobileProjectsProvider.setServerUrl(SERVER_URL);

			// Register workspace
			await registerWorkspace();

			// Start polling
			startPolling();

			vscode.window.showInformationMessage('✅ Connected to AETHER Server');
		} else {
			throw new Error('Server not responding');
		}
	} catch (error: any) {
		statusBarManager.setDisconnected();
		vscode.window.showErrorMessage(`❌ Connection failed: ${error.message}`);
	}
}

function disconnect() {
	if (pollingInterval) {
		clearInterval(pollingInterval);
		pollingInterval = undefined;
	}
	statusBarManager.setDisconnected();
	vscode.window.showInformationMessage('Disconnected from AETHER Server');
}

function startPolling() {
	if (pollingInterval) clearInterval(pollingInterval);

	pollingInterval = setInterval(async () => {
		try {
			// Check for pending commands
			const response = await fetch(`${SERVER_URL}/api/sync/events/pending`, {
				headers: { 'ngrok-skip-browser-warning': 'true' }
			});

			if (response.ok) {
				const data = await response.json();
				if (data.events?.length > 0) {
					for (const event of data.events) {
						await syncHandler.handleEvent(event);
					}
				}
			}
		} catch (error) {
			// Silent fail on polling
		}
	}, 500);
}

async function registerWorkspace() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders?.length) return;

	try {
		await fetch(`${SERVER_URL}/api/sync/register-vscode`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'ngrok-skip-browser-warning': 'true'
			},
			body: JSON.stringify({
				workspaces: workspaceFolders.map(f => ({
					name: f.name,
					path: f.uri.fsPath
				}))
			})
		});
		console.log('📂 Workspace registered');
	} catch (error) {
		console.error('Failed to register workspace:', error);
	}
}

function showStatus() {
	vscode.window.showInformationMessage(
		`AETHER Status\n` +
		`Server: ${SERVER_URL}\n` +
		`Connected: ${statusBarManager.isConnected()}`
	);
}

export function deactivate() {
	if (pollingInterval) {
		clearInterval(pollingInterval);
	}
}
