"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const statusBar_1 = require("./statusBar");
const syncHandler_1 = require("./syncHandler");
const chatPanel_1 = require("./chatPanel");
const mobileProjects_1 = require("./mobileProjects");
const httpClient_1 = require("./httpClient");
let statusBar;
let syncHandler;
let chatProvider;
let mobileProjectsProvider;
let pollingInterval;
let isConnected = false;
function activate(context) {
    console.log('🧠 AETHER AI Assistant activated');
    // Initialize components
    statusBar = new statusBar_1.StatusBarManager(context);
    syncHandler = new syncHandler_1.SyncHandler();
    chatProvider = new chatPanel_1.ChatPanelProvider(context);
    mobileProjectsProvider = new mobileProjects_1.MobileProjectsProvider(context);
    // Register chat panel provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(chatPanel_1.ChatPanelProvider.viewType, chatProvider, { webviewOptions: { retainContextWhenHidden: true } }));
    // Register Mobile Projects TreeView
    context.subscriptions.push(vscode.window.registerTreeDataProvider('aether.mobileProjects', mobileProjectsProvider));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('aether.connect', () => connect()), vscode.commands.registerCommand('aether.disconnect', () => disconnect()), vscode.commands.registerCommand('aether.showStatus', () => showStatus()), vscode.commands.registerCommand('aether.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'aether');
    }), vscode.commands.registerCommand('aether.clearChat', () => {
        vscode.window.showInformationMessage('Chat cleared');
    }), 
    // Mobile Projects commands
    vscode.commands.registerCommand('aether.addCurrentProject', () => mobileProjectsProvider.addCurrentWorkspace()), vscode.commands.registerCommand('aether.browseProject', () => mobileProjectsProvider.browseAndAdd()), vscode.commands.registerCommand('aether.syncProjects', () => mobileProjectsProvider.syncToCloud()), vscode.commands.registerCommand('aether.removeProject', (item) => {
        if (item?.projectPath) {
            mobileProjectsProvider.removeProject(item.projectPath);
        }
    }), vscode.commands.registerCommand('aether.refreshProjects', () => mobileProjectsProvider.refresh()), vscode.commands.registerCommand('aether.clearCloudProjects', () => mobileProjectsProvider.clearCloud()));
    // Auto-connect if enabled
    const config = vscode.workspace.getConfiguration('aether');
    if (config.get('autoConnect', true)) {
        connect();
    }
}
async function connect() {
    const config = vscode.workspace.getConfiguration('aether');
    let serverUrl = config.get('serverUrl', 'https://aether-server.fly.dev');
    const interval = config.get('pollingInterval', 500);
    // FIX: Force Cloud URL if Localhost is configured (for LTE support)
    if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1') || serverUrl.includes('railway.app')) {
        serverUrl = 'https://aether-server.fly.dev';
        vscode.window.showWarningMessage('⚠️ AETHER: Localhost settings detected. Switched to Cloud Server for LTE/Mobile support.');
    }
    statusBar.setConnecting();
    try {
        // Test connection
        const response = await (0, httpClient_1.httpGet)(`${serverUrl}/api/sync/status`);
        if (!response.success) {
            throw new Error('Server not reachable');
        }
        isConnected = true;
        statusBar.setConnected();
        // Set server URL for sync handler and mobile projects
        syncHandler.setServerUrl(serverUrl);
        mobileProjectsProvider.setServerUrl(serverUrl);
        // Register current workspace with server
        // await registerWorkspace(serverUrl as string); // Disabled to prevent duplicate project registration
        // Sync selected mobile projects to cloud
        await mobileProjectsProvider.syncToCloud();
        startPolling(serverUrl, interval);
        vscode.window.showInformationMessage('🟢 AETHER: Connected to server');
    }
    catch (error) {
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
function startPolling(serverUrl, interval) {
    let errorCount = 0;
    const MAX_ERRORS = 3;
    pollingInterval = setInterval(async () => {
        try {
            const statusResponse = await (0, httpClient_1.httpGet)(`${serverUrl}/api/sync/status`);
            if (statusResponse.success) {
                errorCount = 0;
                const data = statusResponse.data;
                statusBar.setMobileStatus(data.hasMobile);
            }
            else {
                errorCount++;
            }
            // Check for pending sync events
            const eventsResponse = await (0, httpClient_1.httpGet)(`${serverUrl}/api/sync/events/pending`);
            if (eventsResponse.success && eventsResponse.data?.events) {
                const events = eventsResponse.data.events;
                if (Array.isArray(events)) {
                    syncHandler.setServerUrl(serverUrl);
                    for (const event of events) {
                        await syncHandler.handleEvent(event);
                    }
                }
            }
        }
        catch (error) {
            errorCount++;
            if (errorCount >= MAX_ERRORS) {
                statusBar.setDisconnected();
            }
        }
    }, interval);
}
async function registerWorkspace(serverUrl) {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }
        const workspace = workspaceFolders[0];
        const projectPath = workspace.uri.fsPath;
        const projectName = workspace.name;
        // Register this VS Code instance as a project source
        await (0, httpClient_1.httpPost)(`${serverUrl}/api/sync/register-vscode`, {
            projectPath,
            projectName,
            type: 'vscode'
        });
        console.log(`📁 Registered workspace: ${projectName}`);
    }
    catch (error) {
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
    vscode.window.showInformationMessage(`🧠 AETHER Status:\n` +
        `Server: ${serverUrl}\n` +
        `Connected: ${isConnected ? 'Yes ✅' : 'No ❌'}\n` +
        `Model: ${model}`);
}
function deactivate() {
    disconnect();
    chatProvider?.dispose();
}
//# sourceMappingURL=extension.js.map