/**
 * 🔌 API Routes - Using unified cache
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
    addPendingEvent
} from '../cache/projectCache.js';

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
        const { projects } = req.body as { projects: Array<{ name: string; path: string; files?: any[] }> };

        if (!projects || !Array.isArray(projects)) {
            return res.status(400).json({ success: false, error: 'Invalid projects array' });
        }

        registerProjects(projects);

        console.log(`📂 Registered ${projects.length} projects via API`);
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

    console.log('🔌 API routes initialized');
}
