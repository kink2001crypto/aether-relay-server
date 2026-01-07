/**
 * 💬 Chat Panel Provider
 */

import * as vscode from 'vscode';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aether.chatPanel';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml();
    }

    private _getHtml(): string {
        return `<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: system-ui; padding: 10px; background: #1e1e1e; color: #fff; }
		.info { text-align: center; margin-top: 50px; }
	</style>
</head>
<body>
	<div class="info">
		<h3>AETHER Chat</h3>
		<p>Use the mobile app for chat</p>
	</div>
</body>
</html>`;
    }
}
