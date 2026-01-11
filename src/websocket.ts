/**
 * ⚡ WebSocket Handler - Real-time communication
 * Uses unified project cache shared with API
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { saveMessage, getMessages, clearMessages } from './db/database.js';
import { callAI } from './ai/router.js';
import {
    getProjects,
    getProject,
    registerProjects,
    getFilesAtPath,
    getFileContent,
    addPendingEvent,
    setSocketIO
} from './cache/projectCache.js';

export function setupWebSocket(io: SocketIOServer) {
    // Share socket.io instance with cache
    setSocketIO(io);

    io.on('connection', (socket: Socket) => {
        console.log(`⚡ Client connected: ${socket.id}`);

        // Send projects on connect
        const projects = getProjects();
        socket.emit('projects', projects);

        // ========== REGISTER ==========

        socket.on('register', (data: { type: string }) => {
            console.log(`📱 ${data.type} registered: ${socket.id}`);
        });

        // ========== PROJECTS ==========

        socket.on('getProjects', () => {
            const projects = getProjects();
            socket.emit('projects', projects);
        });

        socket.on('setProject', (data: { name: string; path: string; folder?: string } | null) => {
            if (!data || !data.name) {
                console.log('⚠️ setProject called with null/invalid data');
                return;
            }
            console.log(`📂 Project selected: ${data.name}`);
            socket.broadcast.emit('project:changed', data);

            // Also add to pending events for polling VS Code clients
            addPendingEvent('project:changed', data);
        });

        // Register projects from VS Code extension
        socket.on('registerProjects', (data: { projects: Array<{ name: string; path: string; files?: any[] }> }) => {
            console.log(`📂 Registering ${data.projects.length} projects via WebSocket`);

            registerProjects(data.projects);

            socket.emit('projectsRegistered', { success: true, count: data.projects.length });
        });

        // ========== FILES ==========

        socket.on('getFiles', (data: { path: string; projectPath?: string }) => {
            const projectPath = data.projectPath;
            if (!projectPath) {
                socket.emit('files', []);
                return;
            }

            const files = getFilesAtPath(projectPath, data.path || '');
            socket.emit('files', files);
        });

        socket.on('getFileContent', (data: { path: string; projectPath?: string }) => {
            const projectPath = data.projectPath;
            if (!projectPath) {
                socket.emit('fileContent', { content: '', error: 'No project selected' });
                return;
            }

            const result = getFileContent(projectPath, data.path);
            socket.emit('fileContent', result);
        });

        // ========== CHAT ==========

        socket.on('chat', async (data: { message: string; model?: string; projectPath?: string; apiKey?: string }) => {
            console.log(`💬 Chat: ${data.message.substring(0, 50)}...`);

            try {
                // Save user message
                if (data.projectPath) {
                    saveMessage(data.projectPath, 'user', data.message);
                }

                // Build context from project files
                let projectContext = '';
                if (data.projectPath) {
                    const project = getProject(data.projectPath);
                    if (project?.files) {
                        const extractContent = (items: any[], basePath = ''): string[] => {
                            const contents: string[] = [];
                            for (const item of items) {
                                const path = basePath ? `${basePath}/${item.name}` : item.name;
                                if (item.type === 'file' && item.content) {
                                    contents.push(`=== ${path} ===\n${item.content}`);
                                } else if (item.type === 'directory' && item.children) {
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
                const response = await callAI({
                    message: data.message,
                    projectContext,
                    model: data.model || 'gemini',
                    apiKey: data.apiKey
                });

                // Save assistant message
                if (data.projectPath) {
                    saveMessage(data.projectPath, 'assistant', response.content);
                }

                // Extract code blocks
                const codeBlocks: { language: string; code: string }[] = [];
                const regex = /```(\w+)?\n([\s\S]*?)```/g;
                let match;
                while ((match = regex.exec(response.content)) !== null) {
                    codeBlocks.push({ language: match[1] || 'text', code: match[2].trim() });
                }

                socket.emit('aiResponse', {
                    content: response.content,
                    codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
                });

            } catch (error: any) {
                console.error('Chat error:', error);
                socket.emit('aiResponse', { content: `Error: ${error.message}` });
            }
        });

        // ========== HISTORY ==========

        socket.on('getConversationHistory', (data: { projectPath: string }) => {
            const messages = getMessages(data.projectPath);
            socket.emit('conversationHistory', { messages, projectPath: data.projectPath });
        });

        socket.on('clearConversationHistory', (data: { projectPath: string }) => {
            const deleted = clearMessages(data.projectPath);
            socket.emit('conversationHistoryCleared', { success: true, deleted });
        });

        // ========== APPLY CODE ==========

        socket.on('applyCode', (data: { code: string; filePath: string; projectPath: string }) => {
            console.log(`📝 Apply code to: ${data.filePath}`);

            // Broadcast to VS Code clients via WebSocket
            socket.broadcast.emit('file:apply', {
                path: data.filePath,
                content: data.code,
                projectPath: data.projectPath
            });

            // Also add to pending events for polling VS Code clients
            addPendingEvent('file:apply', {
                filePath: data.filePath,
                content: data.code,
                projectPath: data.projectPath
            });

            socket.emit('codeApplied', { success: true, path: data.filePath, message: 'Sent to VS Code' });
        });

        // ========== TERMINAL ==========

        socket.on('terminal', (data: { command: string; projectPath?: string }) => {
            console.log(`🖥️ Terminal: ${data.command}`);

            // Broadcast to VS Code clients
            socket.broadcast.emit('terminal:exec', {
                command: data.command,
                projectPath: data.projectPath
            });

            // Also add to pending events for polling
            addPendingEvent('terminal', {
                command: data.command,
                projectPath: data.projectPath
            });
        });

        // Terminal response from VS Code
        socket.on('terminal:response', (data: { output: string; exitCode?: number }) => {
            socket.broadcast.emit('terminalOutput', data);
        });

        // ========== GIT ==========

        socket.on('gitStatus', (data: { projectPath: string }) => {
            socket.broadcast.emit('git:status', data);
            addPendingEvent('git:status', data);
        });

        socket.on('gitCommit', (data: { projectPath: string; message: string }) => {
            socket.broadcast.emit('git:commit', data);
            addPendingEvent('git:commit', data);
        });

        socket.on('gitPush', (data: { projectPath: string }) => {
            socket.broadcast.emit('git:push', data);
            addPendingEvent('git:push', data);
        });

        // Git responses from VS Code
        socket.on('git:statusResult', (data: any) => socket.broadcast.emit('gitStatus', data));
        socket.on('git:commitResult', (data: any) => socket.broadcast.emit('gitCommitResult', data));
        socket.on('git:pushResult', (data: any) => socket.broadcast.emit('gitPushResult', data));

        // ========== DELETE ==========

        socket.on('deleteFile', (data: { filePath: string; projectPath: string }) => {
            socket.broadcast.emit('file:delete', data);
            addPendingEvent('file:delete', data);
        });

        socket.on('deleteFolder', (data: { folderPath: string; projectPath: string }) => {
            socket.broadcast.emit('folder:delete', data);
            addPendingEvent('folder:delete', data);
        });

        socket.on('delete:result', (data: any) => socket.broadcast.emit('deleteResult', data));

        // ========== FILE CONTENT REQUEST ==========

        socket.on('file:content-request', (data: { path: string; projectPath: string }) => {
            // First try to get from cache
            const result = getFileContent(data.projectPath, data.path);

            if (result.content) {
                socket.emit('fileContent', result);
            } else {
                // Request from VS Code if not in cache
                socket.broadcast.emit('file:content-request', {
                    path: data.path,
                    projectPath: data.projectPath,
                    requesterId: socket.id
                });

                addPendingEvent('file:content-request', {
                    path: data.path,
                    projectPath: data.projectPath,
                    requesterId: socket.id
                });
            }
        });

        // ========== DISCONNECT ==========

        socket.on('disconnect', () => {
            console.log(`👋 Client disconnected: ${socket.id}`);
        });
    });
}
