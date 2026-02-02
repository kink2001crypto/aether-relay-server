/**
 * ⚡ WebSocket Handler - Real-time communication
 * Uses unified project cache shared with API
 * Enhanced with structured agent actions
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { saveMessage, getMessages, clearMessages } from './db/database.js';
import {
    callAI,
    clearHistory,
    getTaskStatus,
    getProjectTasks,
    recordActionResult,
    AnyAction
} from './ai/index.js';
import {
    getProjects,
    getProject,
    registerProjects,
    getFilesAtPath,
    getFileContent,
    addPendingEvent,
    setSocketIO,
    getCurrentProject,
    setCurrentProject
} from './cache/projectCache.js';

export function setupWebSocket(io: SocketIOServer) {
    // Share socket.io instance with cache
    setSocketIO(io);

    io.on('connection', (socket: Socket) => {
        console.log(`⚡ Client connected: ${socket.id}`);

        // Send projects and current project on connect
        const projects = getProjects();
        socket.emit('projects', projects);

        // Send current selected project
        const currentProject = getCurrentProject();
        if (currentProject) {
            socket.emit('currentProject', currentProject);
        }

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
            // Persist and broadcast to ALL clients (including sender)
            setCurrentProject(data);
        });

        // Get current project (for new connections)
        socket.on('getCurrentProject', () => {
            const current = getCurrentProject();
            socket.emit('currentProject', current);
        });

        // Register projects from VS Code extension
        socket.on('registerProjects', (data: { projects: Array<{ name: string; path: string; files?: any[] }>; clientId?: string }) => {
            // Use socket.id as clientId if not provided
            const clientId = data.clientId || socket.id;
            console.log(`📂 Registering ${data.projects.length} projects from client "${clientId}" via WebSocket`);

            registerProjects(data.projects, clientId);

            socket.emit('projectsRegistered', { success: true, count: data.projects.length });
        });

        // ========== FILES ==========

        socket.on('getFiles', (data: { path: string; projectPath?: string }) => {
            console.log(`📁 getFiles request: path="${data.path}" projectPath="${data.projectPath}"`);

            const projectPath = data.projectPath;
            if (!projectPath) {
                console.log('❌ getFiles: No projectPath provided');
                socket.emit('files', []);
                return;
            }

            const files = getFilesAtPath(projectPath, data.path || '');
            console.log(`✅ getFiles: Returning ${files.length} files for ${projectPath}`);
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

                // Call AI with project path for task tracking
                const response = await callAI({
                    message: data.message,
                    projectContext,
                    model: data.model || 'gemini',
                    apiKey: data.apiKey,
                    projectPath: data.projectPath
                });

                // Save assistant message
                if (data.projectPath) {
                    saveMessage(data.projectPath, 'assistant', response.content);
                }

                // Extract code blocks (legacy format for backwards compatibility)
                const codeBlocks: { language: string; code: string; path?: string }[] = [];
                const regex = /```(\w+)?\n([\s\S]*?)```/g;
                let match;
                while ((match = regex.exec(response.content)) !== null) {
                    const language = match[1] || 'text';
                    const code = match[2].trim();

                    // Try to extract file path from first line
                    const firstLine = code.split('\n')[0];
                    const pathMatch = firstLine.match(/^(?:\/\/|#)\s*(.+\.\w+)/);

                    codeBlocks.push({
                        language,
                        code: pathMatch ? code.split('\n').slice(1).join('\n') : code,
                        path: pathMatch ? pathMatch[1].trim() : undefined
                    });
                }

                // Emit response with structured actions
                socket.emit('aiResponse', {
                    content: response.content,
                    codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
                    actions: response.actions,
                    taskId: response.taskId
                });

            } catch (error: any) {
                console.error('Chat error:', error);
                socket.emit('aiResponse', { content: `Error: ${error.message}`, actions: [] });
            }
        });

        // ========== AGENT ACTIONS ==========

        // Get task status
        socket.on('getTaskStatus', (data: { taskId: string }) => {
            const status = getTaskStatus(data.taskId);
            socket.emit('taskStatus', status || { error: 'Task not found' });
        });

        // Get project tasks history
        socket.on('getProjectTasks', (data: { projectPath: string; limit?: number }) => {
            const tasks = getProjectTasks(data.projectPath, data.limit || 10);
            socket.emit('projectTasks', { projectPath: data.projectPath, tasks });
        });

        // Action feedback from client (when user applies/executes an action)
        socket.on('actionResult', (data: {
            taskId: string;
            actionId: string;
            success: boolean;
            output?: string;
            error?: string;
        }) => {
            console.log(`📋 Action result: ${data.actionId} - ${data.success ? '✅' : '❌'}`);

            const recorded = recordActionResult(
                data.taskId,
                data.actionId,
                data.success,
                data.output,
                data.error
            );

            if (recorded) {
                // Get updated task status and broadcast
                const status = getTaskStatus(data.taskId);
                socket.emit('taskUpdated', status);
                socket.broadcast.emit('taskUpdated', status);
            }
        });

        // Execute action (from mobile to VS Code)
        socket.on('executeAction', (data: { action: AnyAction; projectPath: string }) => {
            console.log(`⚡ Execute action: ${data.action.type} - ${data.action.description}`);

            switch (data.action.type) {
                case 'write_file':
                    socket.broadcast.emit('file:apply', {
                        path: data.action.data.path,
                        content: data.action.data.content,
                        projectPath: data.projectPath,
                        actionId: data.action.id
                    });
                    addPendingEvent('file:apply', {
                        ...data.action.data,
                        projectPath: data.projectPath,
                        actionId: data.action.id
                    });
                    break;

                case 'delete_file':
                    socket.broadcast.emit('file:delete', {
                        filePath: data.action.data.path,
                        projectPath: data.projectPath,
                        actionId: data.action.id
                    });
                    addPendingEvent('file:delete', {
                        filePath: data.action.data.path,
                        projectPath: data.projectPath,
                        actionId: data.action.id
                    });
                    break;

                case 'run_command':
                    socket.broadcast.emit('terminal:exec', {
                        command: data.action.data.command,
                        projectPath: data.projectPath,
                        actionId: data.action.id
                    });
                    addPendingEvent('terminal', {
                        command: data.action.data.command,
                        projectPath: data.projectPath,
                        actionId: data.action.id
                    });
                    break;

                case 'git_operation':
                    const gitEvent = `git:${data.action.data.operation}`;
                    socket.broadcast.emit(gitEvent, {
                        projectPath: data.projectPath,
                        actionId: data.action.id,
                        ...data.action.data.args
                    });
                    addPendingEvent(gitEvent, {
                        projectPath: data.projectPath,
                        actionId: data.action.id,
                        ...data.action.data.args
                    });
                    break;
            }

            socket.emit('actionDispatched', {
                actionId: data.action.id,
                type: data.action.type
            });
        });

        // ========== HISTORY ==========

        socket.on('getConversationHistory', (data: { projectPath: string }) => {
            const messages = getMessages(data.projectPath);
            socket.emit('conversationHistory', { messages, projectPath: data.projectPath });
        });

        socket.on('clearConversationHistory', (data: { projectPath: string }) => {
            const deleted = clearMessages(data.projectPath);
            // Also clear in-memory conversation history
            clearHistory(data.projectPath);
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
