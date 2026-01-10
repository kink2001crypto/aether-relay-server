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
exports.MobileProjectsProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const httpClient_1 = require("./httpClient");
class MobileProjectsProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._syncedProjects = [];
        this._serverUrl = 'https://aether-relay-server-production.up.railway.app';
        // Load saved projects from storage
        this._loadSavedProjects();
        // Load server URL from settings - FORCE CLOUD URL
        const config = vscode.workspace.getConfiguration('aether');
        let serverUrl = config.get('serverUrl', this._serverUrl);
        // FIX: Always use cloud URL (localhost doesn't work on mobile/LTE)
        if (typeof serverUrl === 'string' && (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1'))) {
            serverUrl = 'https://aether-relay-server-production.up.railway.app';
        }
        this._serverUrl = serverUrl;
        // DEBUG: Show that extension loaded
        vscode.window.showInformationMessage(`🔧 AETHER v2.1 loaded - ${this._syncedProjects.length} projets locaux`);
        // AUTO-SYNC: Push saved projects to server on startup (delayed to ensure URL is set)
        if (this._syncedProjects.length > 0) {
            setTimeout(async () => {
                vscode.window.showInformationMessage(`📤 Syncing ${this._syncedProjects.length} projets to ${this._serverUrl}...`);
                try {
                    await this._syncToCloud();
                    vscode.window.showInformationMessage(`✅ ${this._syncedProjects.length} projet(s) synchronisé(s)!`);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`❌ Sync failed: ${err?.message || err}`);
                }
            }, 3000);
        }
    }
    _loadSavedProjects() {
        const saved = this.context.globalState.get('syncedProjects', []);
        this._syncedProjects = saved;
    }
    async _saveSyncedProjects() {
        await this.context.globalState.update('syncedProjects', this._syncedProjects);
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setServerUrl(url) {
        this._serverUrl = url;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show synced projects
            if (this._syncedProjects.length === 0) {
                return Promise.resolve([
                    new ProjectItem('Aucun projet synchronisé', '', 'empty', vscode.TreeItemCollapsibleState.None)
                ]);
            }
            return Promise.resolve(this._syncedProjects.map(p => new ProjectItem(p.name, p.path, 'project', vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
    // Add current workspace to sync list
    async addCurrentWorkspace() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Ouvre un projet d\'abord !');
            return;
        }
        const workspace = workspaceFolders[0];
        const projectPath = workspace.uri.fsPath;
        const projectName = workspace.name;
        // Check if already added
        if (this._syncedProjects.find(p => p.path === projectPath)) {
            vscode.window.showInformationMessage(`Le projet "${projectName}" est déjà synchronisé`);
            return;
        }
        // Get files for this project
        const files = this._getProjectFiles(projectPath);
        // Add to list
        this._syncedProjects.push({ name: projectName, path: projectPath, files });
        await this._saveSyncedProjects();
        // Sync to cloud
        await this._syncToCloud();
        this.refresh();
        vscode.window.showInformationMessage(`✅ Projet "${projectName}" ajouté au mobile`);
    }
    // Browse and add a folder
    async browseAndAdd() {
        const result = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Sélectionner ce projet'
        });
        if (!result || result.length === 0)
            return;
        const projectPath = result[0].fsPath;
        const projectName = path.basename(projectPath);
        // Check if already added
        if (this._syncedProjects.find(p => p.path === projectPath)) {
            vscode.window.showInformationMessage(`Le projet "${projectName}" est déjà synchronisé`);
            return;
        }
        // Get files
        const files = this._getProjectFiles(projectPath);
        // Add
        this._syncedProjects.push({ name: projectName, path: projectPath, files });
        await this._saveSyncedProjects();
        await this._syncToCloud();
        this.refresh();
        vscode.window.showInformationMessage(`✅ Projet "${projectName}" ajouté au mobile`);
    }
    // Remove a project
    async removeProject(projectPath) {
        const project = this._syncedProjects.find(p => p.path === projectPath);
        if (!project)
            return;
        this._syncedProjects = this._syncedProjects.filter(p => p.path !== projectPath);
        await this._saveSyncedProjects();
        await this._syncToCloud();
        this.refresh();
        vscode.window.showInformationMessage(`🗑️ Projet "${project.name}" retiré`);
    }
    // Sync all projects to cloud
    async syncToCloud() {
        await this._syncToCloud();
        vscode.window.showInformationMessage(`🔄 ${this._syncedProjects.length} projet(s) synchronisé(s) au cloud`);
    }
    async _syncToCloud() {
        try {
            // Refresh file lists
            for (const project of this._syncedProjects) {
                project.files = this._getProjectFiles(project.path);
            }
            const projects = this._syncedProjects.map(p => ({
                name: p.name,
                path: p.path,
                files: p.files
            }));
            console.log(`☁️ AETHER: Syncing ${projects.length} projects to ${this._serverUrl}...`);
            console.log(`☁️ AETHER: Projects:`, projects.map(p => p.name).join(', '));
            const result = await (0, httpClient_1.httpPost)(`${this._serverUrl}/api/sync/register-projects`, { projects });
            console.log(`☁️ AETHER: Sync HTTP result:`, JSON.stringify(result));
            if (result.success && result.data?.success) {
                console.log(`✅ AETHER: Successfully synced ${projects.length} projects to cloud`);
            }
            else {
                console.error('❌ AETHER: Sync failed:', result);
                vscode.window.showErrorMessage('❌ Sync error: ' + JSON.stringify(result));
            }
        }
        catch (error) {
            console.error('❌ AETHER: Failed to sync to cloud:', error);
            vscode.window.showErrorMessage('❌ Sync exception: ' + (error?.message || error));
        }
    }
    async clearCloud() {
        if (!this._serverUrl)
            return;
        try {
            await (0, httpClient_1.httpPost)(`${this._serverUrl}/api/sync/clear-projects`, {});
            vscode.window.showInformationMessage('☁️ Cloud projects cleared');
            // Re-sync current
            await this.syncToCloud();
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to clear cloud projects');
        }
    }
    _getProjectFiles(projectPath, relativePath = '', depth = 0) {
        // Limit depth to prevent too deep scanning
        if (depth > 10)
            return [];
        // Code file extensions to cache content for
        const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.css', '.scss', '.html', '.vue', '.svelte', '.yaml', '.yml', '.toml', '.xml', '.sh', '.txt'];
        const MAX_FILE_SIZE = 500 * 1024; // 500KB max per file
        try {
            const targetPath = relativePath ? path.join(projectPath, relativePath) : projectPath;
            const items = fs.readdirSync(targetPath, { withFileTypes: true });
            const result = [];
            const filtered = items
                .filter(item => !item.name.startsWith('.') &&
                item.name !== 'node_modules' &&
                item.name !== '__pycache__' &&
                item.name !== 'dist' &&
                item.name !== 'build' &&
                item.name !== '.git')
                .slice(0, 100); // Limit items per folder
            for (const item of filtered) {
                const itemPath = relativePath ? path.join(relativePath, item.name) : item.name;
                const fullPath = path.join(projectPath, itemPath);
                if (item.isDirectory()) {
                    // Recursively get children
                    const children = this._getProjectFiles(projectPath, itemPath, depth + 1);
                    result.push({
                        name: item.name,
                        path: itemPath,
                        type: 'directory',
                        children: children
                    });
                }
                else {
                    // Check if it's a code file we should cache content for
                    const ext = path.extname(item.name).toLowerCase();
                    let content;
                    if (codeExtensions.includes(ext)) {
                        try {
                            const stats = fs.statSync(fullPath);
                            if (stats.size <= MAX_FILE_SIZE) {
                                content = fs.readFileSync(fullPath, 'utf-8');
                            }
                        }
                        catch (e) {
                            // Ignore read errors
                        }
                    }
                    result.push({
                        name: item.name,
                        path: itemPath,
                        type: 'file',
                        content: content // Will be undefined for binary/large files
                    });
                }
            }
            // Sort: directories first, then alphabetically
            return result.sort((a, b) => {
                if (a.type === b.type)
                    return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
        }
        catch (error) {
            return [];
        }
    }
}
exports.MobileProjectsProvider = MobileProjectsProvider;
class ProjectItem extends vscode.TreeItem {
    constructor(label, projectPath, itemType, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.projectPath = projectPath;
        this.itemType = itemType;
        this.collapsibleState = collapsibleState;
        if (itemType === 'project') {
            this.tooltip = projectPath;
            this.description = projectPath.replace(os.homedir(), '~');
            this.iconPath = { id: 'folder' };
            this.contextValue = 'syncedProject';
        }
        else {
            this.iconPath = { id: 'info' };
        }
    }
}
//# sourceMappingURL=mobileProjects.js.map