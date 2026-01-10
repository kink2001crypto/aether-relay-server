/**
 * 💾 Database - SQLite for persistence
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function initDatabase(): void {
    // Priority: RAILWAY_VOLUME > /data (if volume mounted) > ./data (local dev)
    let dbDir: string;

    if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
        // Railway Volume is configured
        dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH;
        console.log('💾 Using Railway Volume for persistence');
    } else if (process.env.RAILWAY_ENVIRONMENT) {
        // On Railway but no volume - use /data (user should mount a volume there)
        dbDir = '/data';
        console.log('⚠️ Railway detected but no volume. Mount a volume at /data for persistence!');
    } else {
        // Local development
        dbDir = './data';
    }

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'aether.db');
    db = new Database(dbPath);

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            files_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_path TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_path);
    `);

    console.log(`💾 Database initialized at ${dbPath}`);
}

export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

// ========== PROJECTS ==========

export interface Project {
    path: string;
    name: string;
    files?: any[];
    updatedAt?: number;
}

export function saveProject(project: Project): void {
    const db = getDatabase();
    const filesJson = project.files ? JSON.stringify(project.files) : null;

    db.prepare(`
        INSERT INTO projects (path, name, files_json, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(path) DO UPDATE SET
            name = excluded.name,
            files_json = excluded.files_json,
            updated_at = datetime('now')
    `).run(project.path, project.name, filesJson);
}

export function saveProjects(projects: Project[]): void {
    const db = getDatabase();
    const stmt = db.prepare(`
        INSERT INTO projects (path, name, files_json, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(path) DO UPDATE SET
            name = excluded.name,
            files_json = excluded.files_json,
            updated_at = datetime('now')
    `);

    const transaction = db.transaction((projects: Project[]) => {
        for (const p of projects) {
            const filesJson = p.files ? JSON.stringify(p.files) : null;
            stmt.run(p.path, p.name, filesJson);
        }
    });

    transaction(projects);
    console.log(`💾 Saved ${projects.length} projects`);
}

export function loadProjects(): Project[] {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT path, name, files_json, updated_at
        FROM projects
        ORDER BY updated_at DESC
    `).all() as any[];

    return rows.map(row => ({
        path: row.path,
        name: row.name,
        files: row.files_json ? JSON.parse(row.files_json) : undefined,
        updatedAt: new Date(row.updated_at).getTime()
    }));
}

export function clearProjects(): void {
    const db = getDatabase();
    db.prepare('DELETE FROM projects').run();
}

export function getProjectFiles(projectPath: string): any[] {
    const db = getDatabase();
    const row = db.prepare('SELECT files_json FROM projects WHERE path = ?').get(projectPath) as any;
    return row?.files_json ? JSON.parse(row.files_json) : [];
}

// ========== MESSAGES ==========

export function saveMessage(projectPath: string, role: string, content: string): void {
    const db = getDatabase();
    db.prepare(`
        INSERT INTO messages (project_path, role, content)
        VALUES (?, ?, ?)
    `).run(projectPath, role, content);
}

export function getMessages(projectPath: string, limit = 50): Array<{ role: string; content: string; createdAt: string }> {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT role, content, created_at as createdAt
        FROM messages
        WHERE project_path = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(projectPath, limit) as any[];

    return rows.reverse();
}

export function clearMessages(projectPath: string): number {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM messages WHERE project_path = ?').run(projectPath);
    return result.changes;
}
