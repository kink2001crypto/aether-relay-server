import * as vscode from 'vscode';
import * as path from 'path';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aether.chatPanel';
    private _view?: vscode.WebviewView;
    private _messages: { role: string; content: string }[] = [];
    private _serverUrl: string = 'https://aether-relay-server-production.up.railway.app';
    private _selectedModel: string = 'gemini';
    private _isConnected: boolean = false;
    private _pollingInterval?: NodeJS.Timeout;

    constructor(private readonly _context: vscode.ExtensionContext) {
        // Load settings
        this._loadSettings();
        // Watch for settings changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('aether')) {
                this._loadSettings();
            }
        });
    }

    private _loadSettings() {
        const config = vscode.workspace.getConfiguration('aether');
        this._serverUrl = config.get('serverUrl', 'https://aether-relay-server-production.up.railway.app');
        this._selectedModel = config.get('selectedModel', 'gemini');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._context.extensionUri, 'resources')
            ]
        };

        webviewView.webview.html = this._getHtmlContent(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this._sendMessage(message.content);
                    break;
                case 'changeModel':
                    this._selectedModel = message.model;
                    await vscode.workspace.getConfiguration('aether').update('selectedModel', message.model, true);
                    // Send variants for this model
                    await this._sendModelVariants(message.model);
                    break;
                case 'changeVariant':
                    await vscode.workspace.getConfiguration('aether').update(`modelVariants.${this._selectedModel}`, message.variant, true);
                    break;
                case 'clearChat':
                    await this._clearChat();
                    break;
                case 'loadHistory':
                    await this._loadHistory();
                    break;
                case 'applyCode':
                    await this._applyCode(message.code, message.filePath);
                    break;
                case 'runCommand':
                    await this._runCommand(message.command);
                    break;
                case 'getConversations':
                    await this._getConversations();
                    break;
                case 'loadConversation':
                    await this._loadConversationByPath(message.projectPath);
                    break;
                case 'deleteConversation':
                    await this._deleteConversation(message.projectPath);
                    break;
                case 'saveApiKey':
                    await this._saveApiKey(message.provider, message.key);
                    break;
                case 'ready':
                    await this._connect();
                    await this._loadHistory();
                    await this._sendModelVariants(this._selectedModel);
                    break;
            }
        });

        // Start polling for updates
        this._startPolling();
    }

    private async _connect() {
        try {
            const response = await fetch(`${this._serverUrl}/api/sync/status`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (response.ok) {
                this._isConnected = true;
                this._updateStatus(true);
            }
        } catch (error) {
            this._isConnected = false;
            this._updateStatus(false);
        }
    }

    private _startPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }

        this._pollingInterval = setInterval(async () => {
            if (!this._isConnected) {
                await this._connect();
                return;
            }

            try {
                // Check for new messages from mobile
                const response = await fetch(`${this._serverUrl}/api/sync/status`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (response.ok) {
                    const data = await response.json() as any;
                    this._updateMobileStatus(data.hasMobile);
                }
            } catch {
                this._updateStatus(false);
            }
        }, 3000);
    }

    private async _sendMessage(content: string) {
        if (!content.trim()) return;

        // Add user message to view
        this._addMessage('user', content);

        // Get workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const projectPath = workspaceFolder?.uri.fsPath || '';

        // Get API key if set
        const config = vscode.workspace.getConfiguration('aether');
        const apiKey = config.get(`apiKeys.${this._selectedModel}`, '');

        try {
            const response = await fetch(`${this._serverUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    message: content,
                    projectPath,
                    model: this._selectedModel,
                    apiKey: apiKey || undefined,
                    source: 'vscode'
                })
            });

            if (response.ok) {
                const data = await response.json() as { response: string };
                this._addMessage('assistant', data.response);
            } else {
                this._addMessage('assistant', '❌ Error: Could not get response from server');
            }
        } catch (error: any) {
            this._addMessage('assistant', `❌ Error: ${error.message}`);
        }
    }

    private async _loadHistory() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        try {
            const response = await fetch(
                `${this._serverUrl}/api/chat/history?projectPath=${encodeURIComponent(workspaceFolder.uri.fsPath)}`,
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );

            if (response.ok) {
                const data = await response.json() as { messages: { role: string; content: string }[] };
                this._messages = data.messages || [];
                this._view?.webview.postMessage({
                    type: 'loadMessages',
                    messages: this._messages
                });
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    private async _clearChat() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        try {
            await fetch(`${this._serverUrl}/api/chat/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ projectPath: workspaceFolder.uri.fsPath })
            });

            this._messages = [];
            this._view?.webview.postMessage({ type: 'clearMessages' });
        } catch (error) {
            console.error('Failed to clear chat:', error);
        }
    }

    private async _applyCode(code: string, filePath: string) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
            const uri = vscode.Uri.file(fullPath);

            // Create or update file
            await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf8'));

            // Open the file
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(`✅ Applied: ${filePath}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Failed to apply: ${error.message}`);
        }
    }

    private async _runCommand(command: string) {
        const terminal = vscode.window.createTerminal('AETHER');
        terminal.show();
        terminal.sendText(command);
    }

    private async _getConversations() {
        try {
            const response = await fetch(`${this._serverUrl}/api/chat/conversations`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            if (response.ok) {
                const data = await response.json() as { conversations: any[] };
                this._view?.webview.postMessage({
                    type: 'conversations',
                    conversations: data.conversations || []
                });
            }
        } catch (error) {
            console.error('Failed to get conversations:', error);
        }
    }

    private async _loadConversationByPath(projectPath: string) {
        try {
            const response = await fetch(
                `${this._serverUrl}/api/chat/history?projectPath=${encodeURIComponent(projectPath)}`,
                { headers: { 'ngrok-skip-browser-warning': 'true' } }
            );

            if (response.ok) {
                const data = await response.json() as { messages: { role: string; content: string }[] };
                this._messages = data.messages || [];
                this._view?.webview.postMessage({
                    type: 'loadMessages',
                    messages: this._messages
                });
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    private async _deleteConversation(projectPath: string) {
        try {
            await fetch(`${this._serverUrl}/api/chat/conversations`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ projectPath })
            });

            // Refresh conversations list
            await this._getConversations();
            vscode.window.showInformationMessage('Conversation deleted');
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    }

    private async _saveApiKey(provider: string, key: string) {
        try {
            await vscode.workspace.getConfiguration('aether').update(`apiKeys.${provider}`, key, true);
            vscode.window.showInformationMessage(`${provider} API key saved`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
        }
    }

    private async _sendModelVariants(model: string) {
        // Model variants
        const variants: Record<string, { id: string; name: string }[]> = {
            gemini: [
                { id: 'gemini-2.5-flash', name: '2.5 Flash (Latest)' },
                { id: 'gemini-2.0-flash', name: '2.0 Flash' },
                { id: 'gemini-1.5-pro', name: '1.5 Pro' },
                { id: 'gemini-1.5-flash', name: '1.5 Flash' },
            ],
            ollama: [
                { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B' },
                { id: 'llama3.2', name: 'Llama 3.2' },
                { id: 'codellama', name: 'Code Llama' },
            ],
            claude: [
                { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            ],
            openai: [
                { id: 'gpt-4o', name: 'GPT-4o' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            ],
            deepseek: [
                { id: 'deepseek-chat', name: 'DeepSeek Chat' },
                { id: 'deepseek-coder', name: 'DeepSeek Coder' },
            ],
            grok: [
                { id: 'grok-2-latest', name: 'Grok 2' },
            ],
        };

        this._view?.webview.postMessage({
            type: 'models',
            models: variants
        });
    }

    private _addMessage(role: string, content: string) {
        this._messages.push({ role, content });
        this._view?.webview.postMessage({
            type: 'addMessage',
            role,
            content
        });
    }

    private _updateStatus(connected: boolean) {
        this._view?.webview.postMessage({
            type: 'status',
            connected
        });
    }

    private _updateMobileStatus(hasMobile: boolean) {
        this._view?.webview.postMessage({
            type: 'mobileStatus',
            connected: hasMobile
        });
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'chat.css')
        );
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'resources', 'chat.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${cssUri}" rel="stylesheet">
    <title>AETHER AI</title>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <div class="logo">🧠</div>
                <div class="title">AETHER</div>
            </div>
            <div class="header-right">
                <div class="status-dot" id="statusDot" title="Server"></div>
                <div class="mobile-dot" id="mobileDot" title="Mobile 📱"></div>
                <button class="icon-btn" id="projectsBtn" title="📱 Mobile Projects">📂</button>
                <button class="icon-btn" id="historyBtn" title="History">📜</button>
                <button class="icon-btn" id="settingsBtn" title="Settings">⚙️</button>
            </div>
        </div>

        <!-- Model Selection Bar -->
        <div class="model-bar">
            <select id="modelSelect" class="model-select">
                <option value="gemini">🌟 Gemini</option>
                <option value="ollama">🦙 Ollama</option>
                <option value="claude">🔮 Claude</option>
                <option value="openai">🤖 OpenAI</option>
                <option value="deepseek">🔍 DeepSeek</option>
                <option value="grok">⚡ Grok</option>
            </select>
            <select id="variantSelect" class="variant-select">
                <option value="gemini-2.5-flash">2.5 Flash</option>
                <option value="gemini-2.0-flash">2.0 Flash</option>
                <option value="gemini-1.5-pro">1.5 Pro</option>
            </select>
        </div>

        <!-- History Panel (hidden by default) -->
        <div class="side-panel" id="historyPanel">
            <div class="panel-header">
                <span>📜 Conversations</span>
                <button class="close-btn" onclick="toggleHistory()">✕</button>
            </div>
            <div class="panel-content" id="conversationsList">
                <div class="empty-history">Loading...</div>
            </div>
        </div>

        <!-- Settings Panel (hidden by default) -->
        <div class="side-panel" id="settingsPanel">
            <div class="panel-header">
                <span>⚙️ Settings</span>
                <button class="close-btn" onclick="toggleSettings()">✕</button>
            </div>
            <div class="panel-content">
                <div class="settings-section">
                    <label>Gemini API Key</label>
                    <div class="api-key-row">
                        <input type="password" id="apiKey-gemini" placeholder="AIza..." />
                        <button onclick="saveApiKey('gemini')">💾</button>
                    </div>
                </div>
                <div class="settings-section">
                    <label>OpenAI API Key</label>
                    <div class="api-key-row">
                        <input type="password" id="apiKey-openai" placeholder="sk-..." />
                        <button onclick="saveApiKey('openai')">💾</button>
                    </div>
                </div>
                <div class="settings-section">
                    <label>Claude API Key</label>
                    <div class="api-key-row">
                        <input type="password" id="apiKey-claude" placeholder="sk-ant-..." />
                        <button onclick="saveApiKey('claude')">💾</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Projects Panel (hidden by default) -->
        <div class="side-panel" id="projectsPanel">
            <div class="panel-header">
                <span>📱 Mobile Projects</span>
                <button class="close-btn" onclick="toggleProjects()">✕</button>
            </div>
            <div class="panel-content">
                <div class="projects-info">
                    Sélectionne les projets à synchroniser avec ton téléphone.
                </div>
                <div class="project-actions">
                    <button class="action-btn" onclick="addCurrentWorkspace()">➕ Ajouter ce projet</button>
                    <button class="action-btn" onclick="browseForProject()">📁 Parcourir...</button>
                    <button class="action-btn" onclick="syncAllProjects()">🔄 Synchroniser</button>
                </div>
                <div class="synced-projects" id="syncedProjectsList">
                    <div class="empty-projects">Aucun projet synchronisé</div>
                </div>
            </div>
        </div>

        <!-- Messages -->
        <div class="messages" id="messages">
            <div class="welcome">
                <div class="welcome-icon">🚀</div>
                <div class="welcome-title">Welcome to AETHER AI</div>
                <div class="welcome-text">Ask me to write code, fix bugs, or explain concepts!</div>
            </div>
        </div>

        <!-- Input -->
        <div class="input-container">
            <div class="input-wrapper">
                <textarea id="messageInput" placeholder="Ask AETHER..." rows="1"></textarea>
                <button id="micButton" class="icon-button" title="Voice input">🎤</button>
                <button id="sendButton" class="send-button" title="Send">➤</button>
            </div>
            <div class="input-footer">
                <button id="clearButton" class="text-button">🗑️ Clear</button>
                <span class="hint">Shift+Enter for new line</span>
            </div>
        </div>
    </div>
    <script src="${jsUri}"></script>
</body>
</html>`;
    }

    public dispose() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }
    }
}
