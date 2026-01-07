/**
 * 🌐 Mobile Projects Provider - Server-Only
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_URL = 'https://aether-relay-server-production.up.railway.app';

export class MobileProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ProjectItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _serverUrl: string = SERVER_URL;
    private _projects: Array<{ name: string; path: string }> = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadProjects();
    }

    setServerUrl(url: string) {
        this._serverUrl = url;
    }

    private async loadProjects() {
        const saved = this.context.globalState.get<Array<{ name: string; path: string }>>('aetherProjects', []);
        this._projects = saved;
    }

    private async saveProjects() {
        await this.context.globalState.update('aetherProjects', this._projects);
    }

    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    getChildren(): ProjectItem[] {
        return this._projects.map(p => new ProjectItem(p.name, p.path));
    }

    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }

    async addCurrentProject() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const projectPath = workspaceFolder.uri.fsPath;
        const projectName = workspaceFolder.name;

        // Get files with content
        const files = this._getProjectFiles(projectPath);

        // Add to local list
        if (!this._projects.find(p => p.path === projectPath)) {
            this._projects.push({ name: projectName, path: projectPath });
            await this.saveProjects();
        }

        // Sync to server
        try {
            await fetch(`${this._serverUrl}/api/sync/register-projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projects: [{ name: projectName, path: projectPath, files }]
                })
            });
            vscode.window.showInformationMessage(`✅ Project "${projectName}" synced to server`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to sync: ${error.message}`);
        }

        this.refresh();
    }

    async syncCurrentProject() {
        await this.addCurrentProject();
    }

    async removeProject(item: ProjectItem) {
        this._projects = this._projects.filter(p => p.path !== item.projectPath);
        await this.saveProjects();
        this.refresh();
    }

    async clearAllProjects() {
        this._projects = [];
        await this.saveProjects();

        try {
            await fetch(`${this._serverUrl}/api/sync/clear-projects`, { method: 'POST' });
            vscode.window.showInformationMessage('All projects cleared');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to clear projects from server');
        }

        this.refresh();
    }

    private _getProjectFiles(projectPath: string, relativePath: string = '', depth: number = 0): any[] {
        if (depth > 10) return [];

        const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.css', '.html'];
        const MAX_FILE_SIZE = 500 * 1024;

        try {
            const targetPath = relativePath ? path.join(projectPath, relativePath) : projectPath;
            const items = fs.readdirSync(targetPath, { withFileTypes: true });

            const result: any[] = [];
            const filtered = items
                .filter(item =>
                    !item.name.startsWith('.') &&
                    item.name !== 'node_modules' &&
                    item.name !== 'dist' &&
                    item.name !== 'build' &&
                    item.name !== '__pycache__'
                )
                .slice(0, 100);

            for (const item of filtered) {
                const itemPath = relativePath ? path.join(relativePath, item.name) : item.name;
                const fullPath = path.join(projectPath, itemPath);

                if (item.isDirectory()) {
                    result.push({
                        name: item.name,
                        path: itemPath,
                        type: 'directory',
                        children: this._getProjectFiles(projectPath, itemPath, depth + 1)
                    });
                } else {
                    const ext = path.extname(item.name);
                    let content: string | undefined;

                    if (codeExtensions.includes(ext)) {
                        try {
                            const stats = fs.statSync(fullPath);
                            if (stats.size < MAX_FILE_SIZE) {
                                content = fs.readFileSync(fullPath, 'utf-8');
                            }
                        } catch (e) { }
                    }

                    result.push({
                        name: item.name,
                        path: itemPath,
                        type: 'file',
                        content
                    });
                }
            }

            return result;
        } catch (error) {
            return [];
        }
    }
}

class ProjectItem extends vscode.TreeItem {
    public readonly projectPath: string;

    constructor(label: string, projectPath: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.projectPath = projectPath;
        this.tooltip = projectPath;
        this.contextValue = 'project';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}
