"use strict";
/**
 * ⚡ WebSocket Handler - Real-time communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
const database_js_1 = require("./db/database.js");
const router_js_1 = require("./ai/router.js");
// In-memory project cache (loaded from DB on start)
const projectCache = new Map();
// Load from DB on startup
function loadFromDB() {
    const projects = (0, database_js_1.loadProjects)();
    for (const p of projects) {
        projectCache.set(p.path, p);
    }
    console.log(`📂 Loaded ${projects.length} projects from database`);
}
function setupWebSocket(io) {
    // Load projects from DB
    loadFromDB();
    io.on('connection', (socket) => {
        console.log(`⚡ Client connected: ${socket.id}`);
        // Send projects on connect
        const projects = Array.from(projectCache.values()).map(p => ({
            name: p.name,
            path: p.path,
            folder: '☁️ Cloud'
        }));
        socket.emit('projects', projects);
        // ========== REGISTER ==========
        socket.on('register', (data) => {
            console.log(`📱 ${data.type} registered: ${socket.id}`);
        });
        // ========== PROJECTS ==========
        socket.on('getProjects', () => {
            const projects = Array.from(projectCache.values()).map(p => ({
                name: p.name,
                path: p.path,
                folder: '☁️ Cloud'
            }));
            socket.emit('projects', projects);
        });
        socket.on('setProject', (data) => {
            console.log(`📂 Project selected: ${data.name}`);
            socket.broadcast.emit('project:changed', data);
        });
        // Register projects from VS Code extension
        socket.on('registerProjects', (data) => {
            console.log(`📂 Registering ${data.projects.length} projects`);
            for (const p of data.projects) {
                projectCache.set(p.path, {
                    path: p.path,
                    name: p.name,
                    files: p.files
                });
            }
            // Persist to DB
            (0, database_js_1.saveProjects)(data.projects.map(p => ({ path: p.path, name: p.name, files: p.files })));
            // Broadcast updated list
            const projects = Array.from(projectCache.values()).map(p => ({
                name: p.name,
                path: p.path,
                folder: '☁️ Cloud'
            }));
            io.emit('projects', projects);
            socket.emit('projectsRegistered', { success: true, count: data.projects.length });
        });
        // ========== FILES ==========
        socket.on('getFiles', (data) => {
            const projectPath = data.projectPath;
            if (!projectPath) {
                socket.emit('files', []);
                return;
            }
            const project = projectCache.get(projectPath);
            if (!project || !project.files) {
                console.log(`⚠️ No files for project: ${projectPath}`);
                socket.emit('files', []);
                return;
            }
            // Navigate to requested path
            let files = project.files;
            if (data.path && data.path !== '/') {
                const parts = data.path.split('/').filter(Boolean);
                for (const part of parts) {
                    const dir = files.find(f => f.name === part && f.type === 'directory');
                    if (dir && dir.children) {
                        files = dir.children;
                    }
                    else {
                        files = [];
                        break;
                    }
                }
            }
            socket.emit('files', files);
        });
        socket.on('getFileContent', (data) => {
            const projectPath = data.projectPath;
            if (!projectPath) {
                socket.emit('fileContent', { content: '', error: 'No project selected' });
                return;
            }
            const project = projectCache.get(projectPath);
            if (!project || !project.files) {
                socket.emit('fileContent', { content: '', error: 'Project not found' });
                return;
            }
            // Find file in tree
            const findFile = (items, filePath) => {
                const parts = filePath.split('/').filter(Boolean);
                let current = items;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    const item = current.find(f => f.name === part);
                    if (!item)
                        return null;
                    if (i === parts.length - 1) {
                        return item;
                    }
                    if (item.type === 'directory' && item.children) {
                        current = item.children;
                    }
                    else {
                        return null;
                    }
                }
                return null;
            };
            const file = findFile(project.files, data.path);
            if (file && file.content) {
                socket.emit('fileContent', { content: file.content });
            }
            else {
                socket.emit('fileContent', { content: '', error: 'File not found or no content' });
            }
        });
        // ========== CHAT ==========
        socket.on('chat', async (data) => {
            console.log(`💬 Chat: ${data.message.substring(0, 50)}...`);
            try {
                // Save user message
                if (data.projectPath) {
                    (0, database_js_1.saveMessage)(data.projectPath, 'user', data.message);
                }
                // Build context from project files
                let projectContext = '';
                if (data.projectPath) {
                    const project = projectCache.get(data.projectPath);
                    if (project?.files) {
                        const extractContent = (items, basePath = '') => {
                            const contents = [];
                            for (const item of items) {
                                const path = basePath ? `${basePath}/${item.name}` : item.name;
                                if (item.type === 'file' && item.content) {
                                    contents.push(`=== ${path} ===\n${item.content}`);
                                }
                                else if (item.type === 'directory' && item.children) {
                                    contents.push(...extractContent(item.children, path));
                                }
                            }
                            return contents;
                        };
                        const files = extractContent(project.files).slice(0, 20);
                        if (files.length > 0) {
                            projectContext = `\n\n📂 PROJECT FILES:\n${files.join('\n\n')}`;
                        }
                    }
                }
                // Call AI
                const response = await (0, router_js_1.callAI)({
                    message: data.message,
                    projectContext,
                    model: data.model || 'gemini',
                    apiKey: data.apiKey
                });
                // Save assistant message
                if (data.projectPath) {
                    (0, database_js_1.saveMessage)(data.projectPath, 'assistant', response.content);
                }
                // Extract code blocks
                const codeBlocks = [];
                const regex = /```(\w+)?\n([\s\S]*?)```/g;
                let match;
                while ((match = regex.exec(response.content)) !== null) {
                    codeBlocks.push({ language: match[1] || 'text', code: match[2].trim() });
                }
                socket.emit('aiResponse', {
                    content: response.content,
                    codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
                });
            }
            catch (error) {
                console.error('Chat error:', error);
                socket.emit('aiResponse', { content: `Error: ${error.message}` });
            }
        });
        // ========== HISTORY ==========
        socket.on('getConversationHistory', (data) => {
            const messages = (0, database_js_1.getMessages)(data.projectPath);
            socket.emit('conversationHistory', { messages, projectPath: data.projectPath });
        });
        socket.on('clearConversationHistory', (data) => {
            const deleted = (0, database_js_1.clearMessages)(data.projectPath);
            socket.emit('conversationHistoryCleared', { success: true, deleted });
        });
        // ========== APPLY CODE ==========
        socket.on('applyCode', (data) => {
            console.log(`📝 Apply code to: ${data.filePath}`);
            // In cloud mode, we relay this to VS Code
            socket.broadcast.emit('file:apply', {
                path: data.filePath,
                content: data.code,
                projectPath: data.projectPath
            });
            socket.emit('codeApplied', { success: true, path: data.filePath, message: 'Sent to VS Code' });
        });
        // ========== TERMINAL ==========
        socket.on('terminal', (data) => {
            console.log(`🖥️ Terminal: ${data.command}`);
            // Relay to VS Code
            socket.broadcast.emit('terminal:exec', {
                command: data.command,
                projectPath: data.projectPath
            });
        });
        // Terminal response from VS Code
        socket.on('terminal:response', (data) => {
            socket.broadcast.emit('terminalOutput', data);
        });
        // ========== GIT ==========
        socket.on('gitStatus', (data) => {
            socket.broadcast.emit('git:status', data);
        });
        socket.on('gitCommit', (data) => {
            socket.broadcast.emit('git:commit', data);
        });
        socket.on('gitPush', (data) => {
            socket.broadcast.emit('git:push', data);
        });
        // Git responses from VS Code
        socket.on('git:statusResult', (data) => socket.broadcast.emit('gitStatus', data));
        socket.on('git:commitResult', (data) => socket.broadcast.emit('gitCommitResult', data));
        socket.on('git:pushResult', (data) => socket.broadcast.emit('gitPushResult', data));
        // ========== DELETE ==========
        socket.on('deleteFile', (data) => {
            socket.broadcast.emit('file:delete', data);
        });
        socket.on('deleteFolder', (data) => {
            socket.broadcast.emit('folder:delete', data);
        });
        socket.on('delete:result', (data) => socket.broadcast.emit('deleteResult', data));
        // ========== DISCONNECT ==========
        socket.on('disconnect', () => {
            console.log(`👋 Client disconnected: ${socket.id}`);
        });
    });
}
//# sourceMappingURL=websocket.js.map