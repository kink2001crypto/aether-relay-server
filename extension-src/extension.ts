import * as vscode from 'vscode';
import { StatusBarManager } from './statusBar';
import { SyncHandler } from './syncHandler';
import { ChatPanelProvider } from './chatPanel';
import { MobileProjectsProvider } from './mobileProjects';
import { httpGet, httpPost } from './httpClient';

let statusBar: StatusBarManager;
let syncHandler: SyncHandler;
let chatProvider: ChatPanelProvider;
let mobileProjectsProvider: MobileProjectsProvider;
let pollingInterval: NodeJS.Timeout | undefined;
let isConnected = false;

export function activate(context: vscode.ExtensionContext) {
	console.log('🧠 AETHER AI Assistant activated');

	// Initialize components
	statusBar = new StatusBarManager(context);
	syncHandler = new SyncHandler();
	chatProvider = new ChatPanelProvider(context);
	mobileProjectsProvider = new MobileProjectsProvider(context);

	// Register chat panel provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ChatPanelProvider.viewType,
			chatProvider,
			{ webviewOptions: { retainContextWhenHidden: true } }
		)
	);

	// Register Mobile Projects TreeView
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('aether.mobileProjects', mobileProjectsProvider)
	);

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('aether.connect', () => connect()),
		vscode.commands.registerCommand('aether.disconnect', () => disconnect()),
		vscode.commands.registerCommand('aether.showStatus', () => showStatus()),
		vscode.commands.registerCommand('aether.openSettings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'aether');
		}),
		vscode.commands.registerCommand('aether.clearChat', () => {
			vscode.window.showInformationMessage('Chat cleared');
		}),
		// Mobile Projects commands
		vscode.commands.registerCommand('aether.addCurrentProject', () => mobileProjectsProvider.addCurrentWorkspace()),
		vscode.commands.registerCommand('aether.browseProject', () => mobileProjectsProvider.browseAndAdd()),
		vscode.commands.registerCommand('aether.syncProjects', () => mobileProjectsProvider.syncToCloud()),
		vscode.commands.registerCommand('aether.removeProject', (item: any) => {
			if (item?.projectPath) {
				mobileProjectsProvider.removeProject(item.projectPath);
			}
		}),
		vscode.commands.registerCommand('aether.refreshProjects', () => mobileProjectsProvider.refresh()),
		vscode.commands.registerCommand('aether.clearCloudProjects', () => mobileProjectsProvider.clearCloud())
	);

	// Auto-connect if enabled
	const config = vscode.workspace.getConfiguration('aether');
	if (config.get('autoConnect', true)) {
		connect();
	}
}

async function connect() {
	const config = vscode.workspace.getConfiguration('aether');
	let serverUrl = config.get<string>('serverUrl', 'https://aether-server.fly.dev');
	const interval = config.get('pollingInterval', 500);

	// FIX: Force Cloud URL if Localhost is configured (for LTE support)
	if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1') || serverUrl.includes('railway.app')) {
		serverUrl = 'https://aether-server.fly.dev';
		vscode.window.showWarningMessage('⚠️ AETHER: Localhost settings detected. Switched to Cloud Server for LTE/Mobile support.');
	}

	statusBar.setConnecting();

	try {
		// Test connection
		const response = await httpGet(`${serverUrl}/api/sync/status`);
		if (!response.success) {
			throw new Error('Server not reachable');
		}

		isConnected = true;
		statusBar.setConnected();

		// Set server URL for sync handler and mobile projects
		syncHandler.setServerUrl(serverUrl as string);
		mobileProjectsProvider.setServerUrl(serverUrl as string);

		// Register current workspace with server
		await registerWorkspace(serverUrl as string);

		// Sync selected mobile projects to cloud
		await mobileProjectsProvider.syncToCloud();

		startPolling(serverUrl as string, interval as number);
		vscode.window.showInformationMessage('🟢 AETHER: Connected to server');
	} catch (error) {
		isConnected = false;
		statusBar.setDisconnected();
		vscode.window.showErrorMessage(`🔴 AETHER: Failed to connect - ${error}`);
	}
}

function disconnect() {
	if (pollingInterval) {
		clearInterval(pollingInterval);
		pollingInterval = undefined;
	}
	syncHandler.stopCloudSync();
	isConnected = false;
	statusBar.setDisconnected();
	vscode.window.showInformationMessage('AETHER: Disconnected');
}

function startPolling(serverUrl: string, interval: number) {
	let errorCount = 0;
	const MAX_ERRORS = 3;

	pollingInterval = setInterval(async () => {
		try {
			const statusResponse = await httpGet(`${serverUrl}/api/sync/status`);
			if (statusResponse.success) {
				errorCount = 0;
				const data = statusResponse.data as { clients: number; hasMobile: boolean };
				statusBar.setMobileStatus(data.hasMobile);
			} else {
				errorCount++;
			}

			// Check for pending sync events
			const eventsResponse = await httpGet(`${serverUrl}/api/sync/events/pending`);
			if (eventsResponse.success && eventsResponse.data?.events) {
				const events = eventsResponse.data.events as any[];
				if (Array.isArray(events)) {
					syncHandler.setServerUrl(serverUrl);
					for (const event of events) {
						await syncHandler.handleEvent(event);
					}
				}
			}
		} catch (error) {
			errorCount++;
			if (errorCount >= MAX_ERRORS) {
				statusBar.setDisconnected();
			}
		}
	}, interval);
}

async function registerWorkspace(serverUrl: string) {
	try {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return;
		}

		const workspace = workspaceFolders[0];
		const projectPath = workspace.uri.fsPath;
		const projectName = workspace.name;

		// Register this VS Code instance as a project source
		await httpPost(`${serverUrl}/api/sync/register-vscode`, {
			projectPath,
			projectName,
			type: 'vscode'
		});

		console.log(`📁 Registered workspace: ${projectName}`);
	} catch (error) {
		console.error('Failed to register workspace:', error);
	}
}

// Functions removed: scanAndRegisterAllProjects, getProjectFiles
// Hidden files to show
// Functions removed: scanAndRegisterAllProjects, getProjectFiles


function showStatus() {
	const config = vscode.workspace.getConfiguration('aether');
	const serverUrl = config.get('serverUrl', 'https://aether-server.fly.dev');
	const model = config.get('selectedModel', 'gemini');

	vscode.window.showInformationMessage(
		`🧠 AETHER Status:\n` +
		`Server: ${serverUrl}\n` +
		`Connected: ${isConnected ? 'Yes ✅' : 'No ❌'}\n` +
		`Model: ${model}`
	);
}

export function deactivate() {
	disconnect();
	chatProvider?.dispose();
}

