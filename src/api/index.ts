/**
 * 🔌 API Routes - Using unified cache
 * Enhanced with agent task endpoints
 */

import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { getMessages, clearMessages } from '../db/database.js';
import {
    initCache,
    setSocketIO,
    getProjects,
    getProjectsWithFiles,
    registerProject,
    registerProjects,
    clearAllProjects,
    registerVSCodeClient,
    getVSCodeClients,
    getPendingEvents,
    addPendingEvent,
    getCurrentProject,
    setCurrentProject
} from '../cache/projectCache.js';
import {
    getTaskStatus,
    getProjectTasks,
    recordActionResult,
    taskQueue,
    callAI
} from '../ai/index.js';
import { saveMessage, getAllConversations, deleteConversation } from '../db/database.js';

export function setupAPI(app: Express, io: SocketIOServer) {

    // Initialize shared cache
    initCache();
    setSocketIO(io);

    // ========== SYNC ==========

    app.get('/api/sync/status', (req: Request, res: Response) => {
        const sockets = Array.from(io.sockets.sockets.values());
        const vscodeClients = getVSCodeClients();

        res.json({
            success: true,
            connected: true,
            clients: sockets.length,
            vscodeClients: vscodeClients.length,
            hasMobile: sockets.length > 0,
            hasVscode: vscodeClients.length > 0
        });
    });

    app.get('/api/sync/vscode-projects', (req: Request, res: Response) => {
        const projects = getProjectsWithFiles().map(p => ({
            projectPath: p.path,
            projectName: p.name,
            lastSeen: p.updatedAt || Date.now(),
            files: p.files
        }));
        res.json({ success: true, projects });
    });

    // Register VS Code instance
    app.post('/api/sync/register-vscode', (req: Request, res: Response) => {
        const { projectPath, projectName, type } = req.body;

        // Generate a unique ID for this VS Code instance
        const clientId = `vscode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        registerVSCodeClient(clientId, projectPath);

        console.log(`📟 VS Code registered: ${projectName || projectPath}`);
        res.json({ success: true, clientId });
    });

    // Get pending events for polling
    app.get('/api/sync/events/pending', (req: Request, res: Response) => {
        const events = getPendingEvents();
        res.json({ success: true, events });
    });

    // Relay response from VS Code back to mobile
    app.post('/api/sync/relay-response', (req: Request, res: Response) => {
        const { requesterId, type, data } = req.body;

        if (requesterId === 'broadcast') {
            // Broadcast to all clients
            io.emit(type, data);
        } else {
            // Send to specific client
            const socket = io.sockets.sockets.get(requesterId);
            if (socket) {
                socket.emit(type, data);
            }
        }

        res.json({ success: true });
    });

    app.post('/api/sync/register-projects', (req: Request, res: Response) => {
        const { projects, clientId } = req.body as { projects: Array<{ name: string; path: string; files?: any[] }>; clientId?: string };

        if (!projects || !Array.isArray(projects)) {
            return res.status(400).json({ success: false, error: 'Invalid projects array' });
        }

        // Use clientId from body or generate one from request
        const effectiveClientId = clientId || `api-${req.ip || 'unknown'}`;
        registerProjects(projects, effectiveClientId);

        console.log(`📂 Registered ${projects.length} projects from "${effectiveClientId}" via API`);
        res.json({ success: true, registered: projects.length });
    });

    app.post('/api/sync/register-project', (req: Request, res: Response) => {
        const { projectPath, projectName, files } = req.body;

        if (!projectPath || !projectName) {
            return res.status(400).json({ success: false, error: 'Missing projectPath or projectName' });
        }

        registerProject({ path: projectPath, name: projectName, files });

        console.log(`📂 Registered project: ${projectName}`);
        res.json({ success: true });
    });

    app.post('/api/sync/clear-projects', (req: Request, res: Response) => {
        clearAllProjects();
        res.json({ success: true });
    });

    // Get current selected project
    app.get('/api/sync/current-project', (req: Request, res: Response) => {
        const current = getCurrentProject();
        res.json({ success: true, project: current });
    });

    // Set current selected project
    app.post('/api/sync/current-project', (req: Request, res: Response) => {
        const { project } = req.body;
        setCurrentProject(project || null);
        res.json({ success: true });
    });

    // ========== CHAT ==========

    app.get('/api/chat/history', (req: Request, res: Response) => {
        const projectPath = req.query.projectPath as string;
        if (!projectPath) {
            return res.json({ messages: [] });
        }
        const messages = getMessages(projectPath);
        res.json({ messages });
    });

    app.post('/api/chat/clear', (req: Request, res: Response) => {
        const { projectPath } = req.body;
        if (!projectPath) {
            return res.status(400).json({ success: false });
        }
        const deleted = clearMessages(projectPath);
        res.json({ success: true, deleted });
    });

    // POST /api/chat - Main chat endpoint for VS Code extension
    app.post('/api/chat', async (req: Request, res: Response) => {
        const { message, projectPath, model, apiKey, source } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message required' });
        }

        try {
            // Save user message
            if (projectPath) {
                saveMessage(projectPath, 'user', message);
            }

            // Build context from project files
            let projectContext = '';
            if (projectPath) {
                const project = getProjectsWithFiles().find(p => p.path === projectPath);
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
                message,
                projectContext,
                model: model || 'gemini',
                apiKey,
                projectPath: projectPath || 'default'
            });

            // Save assistant message
            if (projectPath) {
                saveMessage(projectPath, 'assistant', response.content);
            }

            console.log(`💬 Chat API [${source || 'unknown'}]: ${message.substring(0, 30)}...`);

            res.json({
                success: true,
                response: response.content,
                actions: response.actions,
                taskId: response.taskId
            });

        } catch (error: any) {
            console.error('Chat API error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                response: `Error: ${error.message}`
            });
        }
    });

    // GET /api/chat/conversations - List all conversations
    app.get('/api/chat/conversations', (req: Request, res: Response) => {
        const conversations = getAllConversations();
        res.json({ conversations });
    });

    // DELETE /api/chat/conversations - Delete a conversation
    app.delete('/api/chat/conversations', (req: Request, res: Response) => {
        const { projectPath } = req.body;
        if (!projectPath) {
            return res.status(400).json({ success: false, error: 'projectPath required' });
        }
        const deleted = deleteConversation(projectPath);
        res.json({ success: true, deleted });
    });

    // ========== AI PROVIDERS ==========

    app.get('/api/ai/providers', (req: Request, res: Response) => {
        res.json({
            providers: [
                { id: 'gemini', name: 'Gemini', available: !!process.env.GEMINI_API_KEY, configured: !!process.env.GEMINI_API_KEY },
                { id: 'openai', name: 'OpenAI', available: !!process.env.OPENAI_API_KEY, configured: !!process.env.OPENAI_API_KEY },
                { id: 'claude', name: 'Claude', available: !!process.env.ANTHROPIC_API_KEY, configured: !!process.env.ANTHROPIC_API_KEY }
            ]
        });
    });

    // ========== AGENT TASKS ==========

    // Get task status by ID
    app.get('/api/tasks/:taskId', (req: Request, res: Response) => {
        const { taskId } = req.params;
        const status = getTaskStatus(taskId);

        if (!status) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        res.json({ success: true, task: status });
    });

    // Get tasks for a project
    app.get('/api/tasks', (req: Request, res: Response) => {
        const projectPath = req.query.projectPath as string;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!projectPath) {
            return res.status(400).json({ success: false, error: 'projectPath required' });
        }

        const tasks = getProjectTasks(projectPath, limit);
        res.json({ success: true, tasks });
    });

    // Record action result (for VS Code feedback)
    app.post('/api/tasks/:taskId/actions/:actionId/result', (req: Request, res: Response) => {
        const { taskId, actionId } = req.params;
        const { success, output, error } = req.body;

        const recorded = recordActionResult(taskId, actionId, success, output, error);

        if (!recorded) {
            return res.status(404).json({ success: false, error: 'Task or action not found' });
        }

        // Broadcast to WebSocket clients
        const status = getTaskStatus(taskId);
        io.emit('taskUpdated', status);

        res.json({ success: true, task: status });
    });

    // Get task queue stats
    app.get('/api/tasks/stats', (req: Request, res: Response) => {
        const stats = taskQueue.getStats();
        res.json({ success: true, stats });
    });

    // ========== DIAGNOSTICS ==========

    app.get('/api/diag', (req: Request, res: Response) => {
        const sockets = Array.from(io.sockets.sockets.values());
        const vscodeClients = getVSCodeClients();
        const projects = getProjects();
        const currentProject = getCurrentProject();
        const stats = taskQueue.getStats();

        res.json({
            server: {
                version: '2.0.0',
                uptime: process.uptime(),
                memory: process.memoryUsage()
            },
            connections: {
                total: sockets.length,
                vscode: vscodeClients.length
            },
            projects: {
                total: projects.length,
                current: currentProject?.name || null
            },
            tasks: stats,
            ai: {
                gemini: !!process.env.GEMINI_API_KEY,
                openai: !!process.env.OPENAI_API_KEY,
                claude: !!process.env.ANTHROPIC_API_KEY
            }
        });
    });

    console.log('🔌 API routes initialized');
}
