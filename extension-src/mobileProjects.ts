import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SyncedProject {
    name: string;
    path: string;
    files?: { name: string; path: string; type: string }[];
}

export class MobileProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _syncedProjects: SyncedProject[] = [];
    private _serverUrl: string = 'https://aether-relay-server-production.up.railway.app';

    constructor(private context: vscode.ExtensionContext) {
        // Load saved projects from storage
        this._loadSavedProjects();

        // Load server URL from settings
        const config = vscode.workspace.getConfiguration('aether');
        this._serverUrl = config.get('serverUrl', this._serverUrl);

        // AUTO-SYNC: Push saved projects to server on startup
        if (this._syncedProjects.length > 0) {
            console.log(`📤 Auto-syncing ${this._syncedProjects.length} saved projects to server`);
            this._syncToCloud().then(() => {
                vscode.window.showInformationMessage(`✅ ${this._syncedProjects.length} projet(s) synchronisé(s) au cloud`);
            }).catch(err => {
                console.error('Auto-sync failed:', err);
            });
        }
    }

    private _loadSavedProjects() {
        const saved = this.context.globalState.get<SyncedProject[]>('syncedProjects', []);
        this._syncedProjects = saved;
    }

    private async _saveSyncedProjects() {
        await this.context.globalState.update('syncedProjects', this._syncedProjects);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setServerUrl(url: string) {
        this._serverUrl = url;
    }

    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
        if (!element) {
            // Root level - show synced projects
            if (this._syncedProjects.length === 0) {
                return Promise.resolve([
                    new ProjectItem('Aucun projet synchronisé', '', 'empty', vscode.TreeItemCollapsibleState.None)
                ]);
            }
            return Promise.resolve(
                this._syncedProjects.map(p =>
                    new ProjectItem(p.name, p.path, 'project', vscode.TreeItemCollapsibleState.None)
                )
            );
        }
        return Promise.resolve([]);
    }

    // Add current workspace to sync list
    async addCurrentWorkspace(): Promise<void> {
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
    async browseAndAdd(): Promise<void> {
        const result = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Sélectionner ce projet'
        });

        if (!result || result.length === 0) return;

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
    async removeProject(projectPath: string): Promise<void> {
        const project = this._syncedProjects.find(p => p.path === projectPath);
        if (!project) return;

        this._syncedProjects = this._syncedProjects.filter(p => p.path !== projectPath);
        await this._saveSyncedProjects();
        await this._syncToCloud();

        this.refresh();
        vscode.window.showInformationMessage(`🗑️ Projet "${project.name}" retiré`);
    }

    // Sync all projects to cloud
    async syncToCloud(): Promise<void> {
        await this._syncToCloud();
        vscode.window.showInformationMessage(`🔄 ${this._syncedProjects.length} projet(s) synchronisé(s) au cloud`);
    }

    private async _syncToCloud(): Promise<void> {
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

            await fetch(`${this._serverUrl}/api/sync/register-projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ projects })
            });

            console.log(`☁️ Synced ${projects.length} projects to cloud`);
        } catch (error) {
            console.error('Failed to sync to cloud:', error);
            vscode.window.showErrorMessage('Erreur de synchronisation au cloud');
        }
    }

    async clearCloud() {
        if (!this._serverUrl) return;

        try {
            await fetch(`${this._serverUrl}/api/sync/clear-projects`, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            vscode.window.showInformationMessage('☁️ Cloud projects cleared');
            // Re-sync current
            await this.syncToCloud();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to clear cloud projects');
        }
    }

    private _getProjectFiles(projectPath: string, relativePath: string = '', depth: number = 0): any[] {
        // Limit depth to prevent too deep scanning
        if (depth > 10) return [];

        // Code file extensions to cache content for
        const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.css', '.scss', '.html', '.vue', '.svelte', '.yaml', '.yml', '.toml', '.xml', '.sh', '.txt'];
        const MAX_FILE_SIZE = 500 * 1024; // 500KB max per file

        try {
            const targetPath = relativePath ? path.join(projectPath, relativePath) : projectPath;
            const items = fs.readdirSync(targetPath, { withFileTypes: true });

            const result: any[] = [];
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
                } else {
                    // Check if it's a code file we should cache content for
                    const ext = path.extname(item.name).toLowerCase();
                    let content: string | undefined;

                    if (codeExtensions.includes(ext)) {
                        try {
                            const stats = fs.statSync(fullPath);
                            if (stats.size <= MAX_FILE_SIZE) {
                                content = fs.readFileSync(fullPath, 'utf-8');
                            }
                        } catch (e) {
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
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
        } catch (error) {
            return [];
        }
    }
}

class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projectPath: string,
        public readonly itemType: 'project' | 'empty',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        if (itemType === 'project') {
            this.tooltip = projectPath;
            this.description = projectPath.replace(os.homedir(), '~');
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'syncedProject';
        } else {
            this.iconPath = new vscode.ThemeIcon('info');
        }
    }
}
