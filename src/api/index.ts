/**
 * 🔌 API Routes
 */

import { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { loadProjects, saveProjects, clearProjects, getMessages, clearMessages, Project } from '../db/database.js';

// In-memory cache (shared with websocket)
let projectCache: Map<string, Project & { files?: any[] }> = new Map();

export function setupAPI(app: Express, io: SocketIOServer) {

    // Load projects into cache
    const projects = loadProjects();
    for (const p of projects) {
        projectCache.set(p.path, p);
    }

    // ========== SYNC ==========

    app.get('/api/sync/status', (req: Request, res: Response) => {
        const sockets = Array.from(io.sockets.sockets.values());
        res.json({
            success: true,
            connected: true,
            clients: sockets.length,
            hasMobile: true,
            hasVscode: true
        });
    });

    app.get('/api/sync/vscode-projects', (req: Request, res: Response) => {
        const projects = Array.from(projectCache.values()).map(p => ({
            projectPath: p.path,
            projectName: p.name,
            lastSeen: p.updatedAt || Date.now(),
            files: p.files
        }));
        res.json({ success: true, projects });
    });

    app.post('/api/sync/register-projects', (req: Request, res: Response) => {
        const { projects } = req.body as { projects: Array<{ name: string; path: string; files?: any[] }> };

        if (!projects || !Array.isArray(projects)) {
            return res.status(400).json({ success: false, error: 'Invalid projects array' });
        }

        for (const p of projects) {
            projectCache.set(p.path, {
                path: p.path,
                name: p.name,
                files: p.files
            });
        }

        saveProjects(projects.map(p => ({ path: p.path, name: p.name, files: p.files })));

        // Broadcast to websocket clients
        const projectList = Array.from(projectCache.values()).map(p => ({
            name: p.name,
            path: p.path,
            folder: '☁️ Cloud'
        }));
        io.emit('projects', projectList);

        console.log(`📂 Registered ${projects.length} projects via API`);
        res.json({ success: true, registered: projects.length });
    });

    app.post('/api/sync/register-project', (req: Request, res: Response) => {
        const { projectPath, projectName, files } = req.body;

        if (!projectPath || !projectName) {
            return res.status(400).json({ success: false, error: 'Missing projectPath or projectName' });
        }

        projectCache.set(projectPath, {
            path: projectPath,
            name: projectName,
            files
        });

        saveProjects([{ path: projectPath, name: projectName, files }]);

        // Broadcast
        const projectList = Array.from(projectCache.values()).map(p => ({
            name: p.name,
            path: p.path,
            folder: '☁️ Cloud'
        }));
        io.emit('projects', projectList);

        console.log(`📂 Registered project: ${projectName}`);
        res.json({ success: true });
    });

    app.post('/api/sync/clear-projects', (req: Request, res: Response) => {
        projectCache.clear();
        clearProjects();
        io.emit('projects', []);
        console.log('🗑️ Cleared all projects');
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
