import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { httpPost } from './httpClient';

interface SyncedProject {
    name: string;
    path: string;
    files?: { name: string; path: string; type: string }[];
}

export class MobileProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null> = new vscode.EventEmitter<ProjectItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null> = this._onDidChangeTreeData.event;

    private _syncedProjects: SyncedProject[] = [];
    private _serverUrl: string = 'https://aether-server.fly.dev';
    private _clientId: string;

    constructor(private context: vscode.ExtensionContext) {
        // Generate unique clientId for this IDE instance (persisted)
        let savedClientId = this.context.globalState.get<string>('aetherClientId');
        if (!savedClientId) {
            // Detect IDE type from app name
            const appName = vscode.env.appName.toLowerCase();
            const ideType = appName.includes('cursor') ? 'antigravity' :
                           appName.includes('code') ? 'vscode' : 'ide';
            savedClientId = `${ideType}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            this.context.globalState.update('aetherClientId', savedClientId);
        }
        this._clientId = savedClientId;

        // Load saved projects from storage
        this._loadSavedProjects();

        // Load server URL from settings - FORCE CLOUD URL
        const config = vscode.workspace.getConfiguration('aether');
        let serverUrl = config.get('serverUrl', this._serverUrl);

        // FIX: Always use cloud URL (localhost doesn't work on mobile/LTE)
        if (typeof serverUrl === 'string' && (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1') || serverUrl.includes('railway.app'))) {
            serverUrl = 'https://aether-server.fly.dev';
        }
        this._serverUrl = serverUrl as string;

        // DEBUG: Show that extension loaded
        vscode.window.showInformationMessage(`🔧 AETHER v2.3 (Fly.io) - ${this._syncedProjects.length} projets locaux`);

        // AUTO-SYNC: Push saved projects to server on startup (delayed to ensure URL is set)
        if (this._syncedProjects.length > 0) {
            setTimeout(async () => {
                vscode.window.showInformationMessage(`📤 Syncing ${this._syncedProjects.length} projets to ${this._serverUrl}...`);
                try {
                    await this._syncToCloud();
                    vscode.window.showInformationMessage(`✅ ${this._syncedProjects.length} projet(s) synchronisé(s)!`);
                } catch (err: any) {
                    vscode.window.showErrorMessage(`❌ Sync failed: ${err?.message || err}`);
                }
            }, 3000);
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
        this._onDidChangeTreeData.fire(undefined);
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

            console.log(`☁️ AETHER [${this._clientId}]: Syncing ${projects.length} projects to ${this._serverUrl}...`);
            console.log(`☁️ AETHER: Projects:`, projects.map(p => p.name).join(', '));

            // Include clientId to merge instead of replace
            const result = await httpPost(`${this._serverUrl}/api/sync/register-projects`, {
                projects,
                clientId: this._clientId
            });

            console.log(`☁️ AETHER: Sync HTTP result:`, JSON.stringify(result));

            if (result.success && result.data?.success) {
                console.log(`✅ AETHER [${this._clientId}]: Successfully synced ${projects.length} projects to cloud`);
            } else {
                console.error('❌ AETHER: Sync failed:', result);
                vscode.window.showErrorMessage('❌ Sync error: ' + JSON.stringify(result));
            }
        } catch (error: any) {
            console.error('❌ AETHER: Failed to sync to cloud:', error);
            vscode.window.showErrorMessage('❌ Sync exception: ' + (error?.message || error));
        }
    }

    async clearCloud() {
        if (!this._serverUrl) return;

        try {
            await httpPost(`${this._serverUrl}/api/sync/clear-projects`, {});
            vscode.window.showInformationMessage('☁️ Cloud projects cleared');
            // Re-sync current
            await this.syncToCloud();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to clear cloud projects');
        }
    }

    // Hardcoded exclusions for directories (never scan these)
    private static readonly EXCLUDED_DIRS = new Set([
        'node_modules', '.git', 'dist', 'build', '.next', '.expo', '.nuxt',
        'coverage', '__pycache__', '.cache', '.parcel-cache', '.turbo',
        'out', '.output', '.vercel', '.netlify', '.serverless',
        'vendor', 'venv', '.venv', 'env', '.env', 'virtualenv',
        '.idea', '.vscode', '.vs', '.gradle', '.mvn',
        'target', 'bin', 'obj', 'Debug', 'Release',
        '.terraform', '.pulumi', 'cdk.out',
        'Pods', '.cocoapods', 'android/build', 'ios/build',
        '.npm', '.yarn', '.pnpm-store', '.bun',
        'tmp', 'temp', 'logs', '.log'
    ]);

    // Hardcoded exclusions for files (never sync these)
    private static readonly EXCLUDED_FILE_PATTERNS = [
        /\.lock$/i,           // package-lock.json, yarn.lock, pnpm-lock.yaml, etc.
        /\.log$/i,            // Any log files
        /\.min\.(js|css)$/i,  // Minified files
        /\.map$/i,            // Source maps
        /\.d\.ts$/i,          // TypeScript declarations (usually generated)
        /\.pyc$/i,            // Python compiled
        /\.pyo$/i,            // Python optimized
        /\.class$/i,          // Java compiled
        /\.jar$/i,            // Java archives
        /\.war$/i,            // Web archives
        /\.dll$/i,            // Dynamic libraries
        /\.so$/i,             // Shared objects
        /\.dylib$/i,          // Mac dynamic libraries
        /\.exe$/i,            // Executables
        /\.bin$/i,            // Binary files
        /\.o$/i,              // Object files
        /\.a$/i,              // Static libraries
        /\.wasm$/i,           // WebAssembly
        /\.sqlite$/i,         // SQLite databases
        /\.db$/i,             // Databases
        /\.png$/i,            // Images
        /\.jpg$/i,
        /\.jpeg$/i,
        /\.gif$/i,
        /\.ico$/i,
        /\.svg$/i,            // Keep SVG small ones only (handled by size limit)
        /\.webp$/i,
        /\.mp3$/i,            // Audio
        /\.wav$/i,
        /\.ogg$/i,
        /\.mp4$/i,            // Video
        /\.webm$/i,
        /\.mov$/i,
        /\.avi$/i,
        /\.pdf$/i,            // Documents
        /\.zip$/i,            // Archives
        /\.tar$/i,
        /\.gz$/i,
        /\.rar$/i,
        /\.7z$/i,
        /\.ttf$/i,            // Fonts
        /\.woff$/i,
        /\.woff2$/i,
        /\.eot$/i,
        /\.otf$/i,
        /DS_Store$/i,         // Mac system files
        /Thumbs\.db$/i,       // Windows system files
    ];

    // Gitignore patterns cache per project
    private _gitignoreCache: Map<string, string[]> = new Map();

    private _loadGitignore(projectPath: string): string[] {
        if (this._gitignoreCache.has(projectPath)) {
            return this._gitignoreCache.get(projectPath)!;
        }

        const patterns: string[] = [];
        const gitignorePath = path.join(projectPath, '.gitignore');

        try {
            if (fs.existsSync(gitignorePath)) {
                const content = fs.readFileSync(gitignorePath, 'utf-8');
                const lines = content.split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    // Skip comments and empty lines
                    if (trimmed && !trimmed.startsWith('#')) {
                        // Remove trailing slashes for directory patterns
                        patterns.push(trimmed.replace(/\/$/, ''));
                    }
                }
            }
        } catch (e) {
            // Ignore errors reading .gitignore
        }

        this._gitignoreCache.set(projectPath, patterns);
        return patterns;
    }

    private _isGitignored(itemName: string, relativePath: string, gitignorePatterns: string[]): boolean {
        const fullRelPath = relativePath ? `${relativePath}/${itemName}` : itemName;

        for (const pattern of gitignorePatterns) {
            // Simple pattern matching (covers most common cases)
            // Exact match
            if (pattern === itemName || pattern === fullRelPath) {
                return true;
            }
            // Wildcard patterns like *.log
            if (pattern.startsWith('*')) {
                const ext = pattern.slice(1);
                if (itemName.endsWith(ext)) {
                    return true;
                }
            }
            // Directory patterns like logs/ matched as logs
            if (itemName === pattern) {
                return true;
            }
        }
        return false;
    }

    private _isExcludedFile(fileName: string): boolean {
        for (const pattern of MobileProjectsProvider.EXCLUDED_FILE_PATTERNS) {
            if (pattern.test(fileName)) {
                return true;
            }
        }
        return false;
    }

    private _getProjectFiles(projectPath: string, relativePath: string = '', depth: number = 0): any[] {
        // Limit depth to prevent too deep scanning (reduced from 10)
        if (depth > 5) return [];

        // Code file extensions to cache content for
        const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.py', '.css', '.scss', '.html', '.vue', '.svelte', '.yaml', '.yml', '.toml', '.xml', '.sh', '.txt', '.env.example', '.env.sample'];
        const MAX_FILE_SIZE = 100 * 1024; // 100KB max per file (reduced from 500KB)
        const MAX_TOTAL_FILES = 500; // Max files per project

        // Load gitignore patterns for this project
        const gitignorePatterns = this._loadGitignore(projectPath);

        try {
            const targetPath = relativePath ? path.join(projectPath, relativePath) : projectPath;
            const items = fs.readdirSync(targetPath, { withFileTypes: true });

            const result: any[] = [];
            let fileCount = 0;

            const filtered = items
                .filter(item => {
                    // Skip hidden files (except important ones)
                    if (item.name.startsWith('.')) {
                        // Allow these specific hidden files
                        const allowedHidden = ['.env.example', '.env.sample', '.eslintrc', '.prettierrc', '.babelrc', '.editorconfig'];
                        if (!allowedHidden.some(h => item.name.startsWith(h))) {
                            return false;
                        }
                    }

                    // Check hardcoded directory exclusions
                    if (item.isDirectory() && MobileProjectsProvider.EXCLUDED_DIRS.has(item.name)) {
                        return false;
                    }

                    // Check hardcoded file exclusions
                    if (item.isFile() && this._isExcludedFile(item.name)) {
                        return false;
                    }

                    // Check gitignore patterns
                    if (this._isGitignored(item.name, relativePath, gitignorePatterns)) {
                        return false;
                    }

                    return true;
                })
                .slice(0, 50); // Reduced limit per folder (from 100)

            for (const item of filtered) {
                if (fileCount >= MAX_TOTAL_FILES) break;

                const itemPath = relativePath ? path.join(relativePath, item.name) : item.name;
                const fullPath = path.join(projectPath, itemPath);

                if (item.isDirectory()) {
                    // Recursively get children
                    const children = this._getProjectFiles(projectPath, itemPath, depth + 1);
                    // Only include directories that have content
                    if (children.length > 0) {
                        result.push({
                            name: item.name,
                            path: itemPath,
                            type: 'directory',
                            children: children
                        });
                        fileCount += children.length;
                    }
                } else {
                    // Check file size first
                    try {
                        const stats = fs.statSync(fullPath);
                        if (stats.size > MAX_FILE_SIZE) {
                            continue; // Skip large files entirely
                        }

                        // Check if it's a code file we should cache content for
                        const ext = path.extname(item.name).toLowerCase();
                        let content: string | undefined;

                        if (codeExtensions.includes(ext)) {
                            try {
                                content = fs.readFileSync(fullPath, 'utf-8');
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
                        fileCount++;
                    } catch (e) {
                        // Skip files we can't stat
                        continue;
                    }
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
            this.iconPath = { id: 'folder' };
            this.contextValue = 'syncedProject';
        } else {
            this.iconPath = { id: 'info' };
        }
    }
}
