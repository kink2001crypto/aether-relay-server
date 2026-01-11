/**
 * 🔄 Unified Project Cache - Single source of truth
 * Shared between API routes and WebSocket handlers
 */

import { loadProjects, saveProjects, clearProjects, Project } from '../db/database.js';
import { Server as SocketIOServer } from 'socket.io';

// Single shared cache instance
const projectCache: Map<string, Project & { files?: any[] }> = new Map();

// Connected VS Code instances (for event relay)
interface VSCodeClient {
    id: string;
    projectPath?: string;
    lastSeen: number;
}
const vscodeClients: Map<string, VSCodeClient> = new Map();

// Pending events for polling (for VS Code clients that can't use WebSocket)
interface PendingEvent {
    type: string;
    data: any;
    timestamp: number;
}
const pendingEvents: PendingEvent[] = [];
const MAX_PENDING_EVENTS = 100;
const EVENT_TTL = 30000; // 30 seconds

// Socket.IO instance for broadcasting
let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer) {
    io = socketIO;
}

/**
 * Initialize cache from database
 */
export function initCache() {
    const projects = loadProjects();
    for (const p of projects) {
        projectCache.set(p.path, p);
    }
    console.log(`📂 Cache initialized with ${projects.length} projects`);
}

/**
 * Get all projects from cache
 */
export function getProjects(): Array<{ name: string; path: string; folder: string }> {
    return Array.from(projectCache.values()).map(p => ({
        name: p.name,
        path: p.path,
        folder: '☁️ Cloud'
    }));
}

/**
 * Get all projects with files
 */
export function getProjectsWithFiles(): Array<Project & { files?: any[] }> {
    return Array.from(projectCache.values());
}

/**
 * Get a single project by path
 */
export function getProject(projectPath: string): (Project & { files?: any[] }) | undefined {
    return projectCache.get(projectPath);
}

/**
 * Register a single project
 */
export function registerProject(project: { name: string; path: string; files?: any[] }) {
    projectCache.set(project.path, {
        path: project.path,
        name: project.name,
        files: project.files
    });

    // Persist to database
    saveProjects([{ path: project.path, name: project.name, files: project.files }]);

    // Broadcast to all clients
    broadcastProjects();

    console.log(`📂 Registered project: ${project.name}`);
}

/**
 * Register multiple projects - REPLACES all existing projects
 */
export function registerProjects(projects: Array<{ name: string; path: string; files?: any[] }>) {
    // Clear existing projects first (this ensures deletions are synced)
    projectCache.clear();
    clearProjects();

    // Add new projects
    for (const p of projects) {
        projectCache.set(p.path, {
            path: p.path,
            name: p.name,
            files: p.files
        });
    }

    // Persist to database
    saveProjects(projects.map(p => ({ path: p.path, name: p.name, files: p.files })));

    // Broadcast to all clients
    broadcastProjects();

    console.log(`📂 Replaced with ${projects.length} projects`);
}

/**
 * Clear all projects
 */
export function clearAllProjects() {
    projectCache.clear();
    clearProjects();
    broadcastProjects();
    console.log('🗑️ Cleared all projects');
}

/**
 * Broadcast project list to all connected clients
 */
function broadcastProjects() {
    if (io) {
        const projects = getProjects();
        io.emit('projects', projects);
    }
}

// ========== VS CODE CLIENT MANAGEMENT ==========

export function registerVSCodeClient(id: string, projectPath?: string) {
    vscodeClients.set(id, {
        id,
        projectPath,
        lastSeen: Date.now()
    });
    console.log(`📟 VS Code client registered: ${id}`);
}

export function removeVSCodeClient(id: string) {
    vscodeClients.delete(id);
}

export function getVSCodeClients(): VSCodeClient[] {
    return Array.from(vscodeClients.values());
}

// ========== EVENT QUEUE FOR POLLING ==========

export function addPendingEvent(type: string, data: any) {
    // Clean old events first
    const now = Date.now();
    while (pendingEvents.length > 0 && now - pendingEvents[0].timestamp > EVENT_TTL) {
        pendingEvents.shift();
    }

    // Add new event
    pendingEvents.push({ type, data, timestamp: now });

    // Limit queue size
    if (pendingEvents.length > MAX_PENDING_EVENTS) {
        pendingEvents.shift();
    }
}

export function getPendingEvents(): PendingEvent[] {
    const now = Date.now();

    // Return and clear events
    const events = pendingEvents
        .filter(e => now - e.timestamp < EVENT_TTL)
        .map(e => ({ type: e.type, data: e.data, timestamp: e.timestamp }));

    // Clear processed events
    pendingEvents.length = 0;

    return events;
}

// ========== FILE NAVIGATION ==========

/**
 * Get files at a specific path within a project
 */
export function getFilesAtPath(projectPath: string, filePath: string): any[] {
    const project = projectCache.get(projectPath);
    if (!project || !project.files) {
        return [];
    }

    let files = project.files;

    if (filePath && filePath !== '/' && filePath !== '') {
        const parts = filePath.split('/').filter(Boolean);
        for (const part of parts) {
            const dir = files.find(f => f.name === part && f.type === 'directory');
            if (dir && dir.children) {
                files = dir.children;
            } else {
                return [];
            }
        }
    }

    return files;
}

/**
 * Get content of a specific file
 */
export function getFileContent(projectPath: string, filePath: string): { content: string; error?: string } {
    const project = projectCache.get(projectPath);
    if (!project || !project.files) {
        return { content: '', error: 'Project not found' };
    }

    // Find file in tree
    const findFile = (items: any[], targetPath: string): any | null => {
        const parts = targetPath.split('/').filter(Boolean);
        let current = items;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const item = current.find(f => f.name === part);

            if (!item) return null;

            if (i === parts.length - 1) {
                return item;
            }

            if (item.type === 'directory' && item.children) {
                current = item.children;
            } else {
                return null;
            }
        }
        return null;
    };

    const file = findFile(project.files, filePath);
    if (file && file.content) {
        return { content: file.content };
    }

    return { content: '', error: 'File not found or no content cached' };
}
