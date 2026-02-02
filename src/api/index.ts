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
    taskQueue
} from '../ai/index.js';

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

    console.log('🔌 API routes initialized');
}
