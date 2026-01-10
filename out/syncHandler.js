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
exports.SyncHandler = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const httpClient_1 = require("./httpClient");
class SyncHandler {
    constructor(serverUrl) {
        this.serverUrl = 'https://aether-relay-server-production.up.railway.app';
        // Terminal PTY properties
        this.writeEmitter = new vscode.EventEmitter();
        if (serverUrl)
            this.serverUrl = serverUrl;
    }
    setServerUrl(url) {
        this.serverUrl = url;
    }
    // Start periodic sync of project files to cloud server
    startCloudSync() {
        // Initial sync
        this.syncProjectToCloud();
        // Sync every 30 seconds
        this.syncInterval = setInterval(() => {
            this.syncProjectToCloud();
        }, 30000);
    }
    stopCloudSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
    // Sync current workspace files to cloud server
    async syncProjectToCloud() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder)
            return;
        const projectPath = workspaceFolder.uri.fsPath;
        const projectName = workspaceFolder.name;
        try {
            // Get file tree (max 3 levels deep)
            const files = this.getFileTree(projectPath, '', 3);
            // Send to server
            await (0, httpClient_1.httpPost)(`${this.serverUrl}/api/sync/register-project`, {
                projectPath,
                projectName,
                files
            });
            console.log(`☁️ Synced ${files.length} items to cloud`);
        }
        catch (error) {
            console.error('Cloud sync failed:', error);
        }
    }
    // Get file tree recursively
    getFileTree(basePath, relativePath, maxDepth) {
        if (maxDepth <= 0)
            return [];
        const fullPath = path.join(basePath, relativePath);
        const items = [];
        // Folders to skip
        const skipFolders = ['node_modules', '.git', '__pycache__', '.next', '.expo', 'dist', 'build', '.cache', 'coverage', 'venv', '.venv'];
        // Hidden files to show
        const showHidden = ['.env', '.env.local', '.env.example', '.gitignore', '.eslintrc', '.prettierrc'];
        try {
            const entries = fs.readdirSync(fullPath, { withFileTypes: true });
            for (const entry of entries) {
                // Skip unwanted folders
                if (skipFolders.includes(entry.name))
                    continue;
                // Handle hidden files
                if (entry.name.startsWith('.')) {
                    if (!showHidden.some(h => entry.name.startsWith(h.replace('.', '')) || entry.name === h)) {
                        continue;
                    }
                }
                const itemPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
                if (entry.isDirectory()) {
                    const children = this.getFileTree(basePath, itemPath, maxDepth - 1);
                    items.push({
                        name: entry.name,
                        path: itemPath,
                        type: 'directory',
                        children
                    });
                }
                else {
                    items.push({
                        name: entry.name,
                        path: itemPath,
                        type: 'file'
                    });
                }
            }
        }
        catch (error) {
            // Skip unreadable directories
        }
        // Sort: directories first, then alphabetically
        return items.sort((a, b) => {
            if (a.type === b.type)
                return a.name.localeCompare(b.name);
            return a.type === 'directory' ? -1 : 1;
        });
    }
    async handleEvent(event) {
        switch (event.type) {
            case 'file:apply':
                // Normalize: server may send 'path' or 'filePath'
                const applyData = {
                    filePath: event.data.filePath || event.data.path,
                    content: event.data.content,
                    projectPath: event.data.projectPath
                };
                await this.handleFileApply(applyData);
                break;
            case 'file:opened':
                await this.handleFileOpen(event.data);
                break;
            case 'file:content-request':
                await this.handleFileContentRequest(event.data);
                break;
            case 'terminal':
                // Input from mobile -> Shell
                await this.handleTerminalInput(event.data);
                break;
            case 'project:changed':
                await this.handleProjectChange(event.data);
                break;
            case 'file:delete':
                await this.handleFileDelete(event.data);
                break;
            case 'folder:delete':
                await this.handleFolderDelete(event.data);
                break;
            case 'git:status':
                await this.handleGitStatus(event.data);
                break;
            case 'git:commit':
                await this.handleGitCommit(event.data);
                break;
            case 'git:push':
                await this.handleGitPush(event.data);
                break;
            case 'terminal:resize':
                // Maybe handle resize later
                break;
            default:
                console.log('Unknown event type:', event.type);
        }
    }
    async handleFileApply(data) {
        try {
            let targetPath = data.filePath;
            // If relative path and we have a workspace, resolve it
            if (!path.isAbsolute(targetPath) && vscode.workspace.workspaceFolders) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                targetPath = path.join(workspaceRoot, targetPath);
            }
            // Ensure directory exists
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Write file
            fs.writeFileSync(targetPath, data.content, 'utf8');
            // Show notification
            vscode.window.showInformationMessage(`📱 Applied: ${path.basename(targetPath)}`, 'Open File').then(selection => {
                if (selection === 'Open File') {
                    vscode.workspace.openTextDocument(targetPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
            // Refresh file explorer
            vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to apply file: ${error}`);
        }
    }
    async handleFileOpen(data) {
        try {
            let targetPath = data.filePath;
            if (!path.isAbsolute(targetPath) && vscode.workspace.workspaceFolders) {
                const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                targetPath = path.join(workspaceRoot, targetPath);
            }
            if (fs.existsSync(targetPath)) {
                const doc = await vscode.workspace.openTextDocument(targetPath);
                await vscode.window.showTextDocument(doc);
            }
        }
        catch (error) {
            console.error('Failed to open file:', error);
        }
    }
    async handleFileContentRequest(data) {
        if (!data.requesterId)
            return;
        try {
            let filePath = data.path;
            let projectPath = data.projectPath;
            // Resolve full path
            let fullPath = filePath;
            if (projectPath) {
                fullPath = path.join(projectPath, filePath);
            }
            else if (!path.isAbsolute(filePath) && vscode.workspace.workspaceFolders) {
                fullPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filePath);
            }
            vscode.window.showInformationMessage(`📱 Relay Request: ${path.basename(fullPath)}`);
            // vscode.window.setStatusBarMessage(`📱 Relay: Reading ${path.basename(fullPath)}`, 3000);
            // Read content
            let content = '';
            let error = '';
            try {
                if (fs.existsSync(fullPath)) {
                    content = fs.readFileSync(fullPath, 'utf8');
                    vscode.window.setStatusBarMessage(`📱 Read ${content.length} chars`, 2000);
                }
                else {
                    error = 'File not found on host';
                    console.error(`File not found: ${fullPath}`);
                    vscode.window.showErrorMessage(`📱 File not found: ${fullPath}`);
                }
            }
            catch (e) {
                error = e.message;
                vscode.window.showErrorMessage(`📱 Read Error: ${e.message}`);
            }
            if (error) {
                vscode.window.showErrorMessage(`📱 Relay Error: ${error} for ${path.basename(fullPath)}`);
            }
            else {
                // Trace success
                console.log(`Sending content of ${fullPath} to ${data.requesterId}`);
            }
            // Send back to server
            await (0, httpClient_1.httpPost)(`${this.serverUrl}/api/sync/relay-response`, {
                requesterId: data.requesterId,
                type: 'file:content',
                data: {
                    content: error ? `Error: ${error}` : content
                }
            });
        }
        catch (error) {
            console.error('Failed to handle content request:', error);
        }
    }
    async handleTerminalInput(data) {
        // Initialize terminal if not exists
        if (!this.terminal || !this.shellProcess) {
            this.initTerminal(data.projectPath);
        }
        if (this.shellProcess) {
            // Write to shell stdin
            this.shellProcess.stdin.write(data.command + '\n');
            // Show notification for big commands
            if (data.command.length > 5) {
                vscode.window.setStatusBarMessage(`📱 Terminal: ${data.command.substring(0, 20)}...`, 2000);
            }
        }
    }
    initTerminal(projectPath) {
        if (this.terminal)
            return;
        this.pty = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.spawnShell(projectPath),
            close: () => this.disposeTerminal(),
            handleInput: (data) => {
                // User typing in VS Code -> send to shell
                this.shellProcess?.stdin.write(data);
            }
        };
        this.terminal = vscode.window.createTerminal({ name: 'Aether Live', pty: this.pty });
        this.terminal.show();
    }
    spawnShell(projectPath) {
        const shell = process.env.SHELL || '/bin/bash';
        let cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (projectPath && fs.existsSync(projectPath)) {
            cwd = projectPath;
        }
        try {
            this.shellProcess = (0, child_process_1.spawn)(shell, [], {
                cwd,
                env: process.env
            });
            this.shellProcess.stdout.on('data', (data) => {
                const str = data.toString();
                this.writeEmitter.fire(str); // Show in VS Code
                this.sendToMobile(str); // Send to Mobile
            });
            this.shellProcess.stderr.on('data', (data) => {
                const str = data.toString();
                this.writeEmitter.fire(str);
                this.sendToMobile(str);
            });
            this.shellProcess.on('exit', (code) => {
                this.writeEmitter.fire(`\r\nShell exited with code ${code}\r\n`);
                this.disposeTerminal();
            });
        }
        catch (e) {
            this.writeEmitter.fire(`\r\nError spawning shell: ${e.message}\r\n`);
        }
    }
    disposeTerminal() {
        this.writeEmitter.dispose();
        this.terminal = undefined;
        this.shellProcess?.kill();
        this.shellProcess = undefined;
    }
    async sendToMobile(data) {
        try {
            await (0, httpClient_1.httpPost)(`${this.serverUrl}/api/sync/relay-response`, {
                requesterId: 'broadcast',
                type: 'terminal:output',
                data: { output: data }
            });
        }
        catch (e) {
            // Ignore errors
        }
    }
    async handleProjectChange(data) {
        try {
            const projectUri = vscode.Uri.file(data.projectPath);
            // Ask user if they want to open the project
            const selection = await vscode.window.showInformationMessage(`📱 Mobile switched to: ${data.projectName}`, 'Open Folder', 'Ignore');
            if (selection === 'Open Folder') {
                await vscode.commands.executeCommand('vscode.openFolder', projectUri);
            }
        }
        catch (error) {
            console.error('Failed to handle project change:', error);
        }
    }
    // ========== FILE/FOLDER DELETE ==========
    async handleFileDelete(data) {
        try {
            let targetPath = data.filePath;
            if (!path.isAbsolute(targetPath) && data.projectPath) {
                targetPath = path.join(data.projectPath, targetPath);
            }
            else if (!path.isAbsolute(targetPath) && vscode.workspace.workspaceFolders) {
                targetPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, targetPath);
            }
            if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
                vscode.window.showInformationMessage(`🗑️ Deleted: ${path.basename(targetPath)}`);
                await this.sendResult('delete:result', { success: true, path: targetPath });
            }
            else {
                await this.sendResult('delete:result', { success: false, error: 'File not found' });
            }
        }
        catch (error) {
            await this.sendResult('delete:result', { success: false, error: error.message });
        }
    }
    async handleFolderDelete(data) {
        try {
            let targetPath = data.folderPath;
            if (!path.isAbsolute(targetPath) && data.projectPath) {
                targetPath = path.join(data.projectPath, targetPath);
            }
            else if (!path.isAbsolute(targetPath) && vscode.workspace.workspaceFolders) {
                targetPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, targetPath);
            }
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true });
                vscode.window.showInformationMessage(`🗑️ Deleted folder: ${path.basename(targetPath)}`);
                await this.sendResult('delete:result', { success: true, path: targetPath });
            }
            else {
                await this.sendResult('delete:result', { success: false, error: 'Folder not found' });
            }
        }
        catch (error) {
            await this.sendResult('delete:result', { success: false, error: error.message });
        }
    }
    // ========== GIT OPERATIONS ==========
    async handleGitStatus(data) {
        try {
            const cwd = data.projectPath || vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!cwd)
                return;
            const { execSync } = require('child_process');
            const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
            const branch = execSync('git branch --show-current', { cwd, encoding: 'utf-8' }).trim();
            await this.sendResult('git:statusResult', {
                success: true,
                branch,
                status: status.split('\n').filter(Boolean).map((line) => ({
                    status: line.substring(0, 2).trim(),
                    file: line.substring(3)
                }))
            });
        }
        catch (error) {
            await this.sendResult('git:statusResult', { success: false, error: error.message });
        }
    }
    async handleGitCommit(data) {
        try {
            const cwd = data.projectPath || vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!cwd)
                return;
            const { execSync } = require('child_process');
            execSync('git add -A', { cwd });
            const result = execSync(`git commit -m "${data.message.replace(/"/g, '\\"')}"`, { cwd, encoding: 'utf-8' });
            vscode.window.showInformationMessage(`📱 Git commit: ${data.message}`);
            await this.sendResult('git:commitResult', { success: true, message: result });
        }
        catch (error) {
            await this.sendResult('git:commitResult', { success: false, error: error.message });
        }
    }
    async handleGitPush(data) {
        try {
            const cwd = data.projectPath || vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!cwd)
                return;
            const { execSync } = require('child_process');
            const result = execSync('git push', { cwd, encoding: 'utf-8' });
            vscode.window.showInformationMessage(`📱 Git push completed`);
            await this.sendResult('git:pushResult', { success: true, message: result });
        }
        catch (error) {
            await this.sendResult('git:pushResult', { success: false, error: error.message });
        }
    }
    async sendResult(type, data) {
        try {
            await (0, httpClient_1.httpPost)(`${this.serverUrl}/api/sync/relay-response`, {
                requesterId: 'broadcast',
                type,
                data
            });
        }
        catch (e) {
            // Ignore errors
        }
    }
}
exports.SyncHandler = SyncHandler;
//# sourceMappingURL=syncHandler.js.map