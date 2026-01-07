"use strict";
/**
 * 💾 Database - SQLite for persistence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDatabase = getDatabase;
exports.saveProject = saveProject;
exports.saveProjects = saveProjects;
exports.loadProjects = loadProjects;
exports.clearProjects = clearProjects;
exports.getProjectFiles = getProjectFiles;
exports.saveMessage = saveMessage;
exports.getMessages = getMessages;
exports.clearMessages = clearMessages;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db;
function initDatabase() {
    // Use /tmp for Railway, local folder for dev
    const dbDir = process.env.RAILWAY_ENVIRONMENT ? '/tmp' : './data';
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path_1.default.join(dbDir, 'aether.db');
    db = new better_sqlite3_1.default(dbPath);
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
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}
function saveProject(project) {
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
function saveProjects(projects) {
    const db = getDatabase();
    const stmt = db.prepare(`
        INSERT INTO projects (path, name, files_json, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(path) DO UPDATE SET
            name = excluded.name,
            files_json = excluded.files_json,
            updated_at = datetime('now')
    `);
    const transaction = db.transaction((projects) => {
        for (const p of projects) {
            const filesJson = p.files ? JSON.stringify(p.files) : null;
            stmt.run(p.path, p.name, filesJson);
        }
    });
    transaction(projects);
    console.log(`💾 Saved ${projects.length} projects`);
}
function loadProjects() {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT path, name, files_json, updated_at
        FROM projects
        ORDER BY updated_at DESC
    `).all();
    return rows.map(row => ({
        path: row.path,
        name: row.name,
        files: row.files_json ? JSON.parse(row.files_json) : undefined,
        updatedAt: new Date(row.updated_at).getTime()
    }));
}
function clearProjects() {
    const db = getDatabase();
    db.prepare('DELETE FROM projects').run();
}
function getProjectFiles(projectPath) {
    const db = getDatabase();
    const row = db.prepare('SELECT files_json FROM projects WHERE path = ?').get(projectPath);
    return row?.files_json ? JSON.parse(row.files_json) : [];
}
// ========== MESSAGES ==========
function saveMessage(projectPath, role, content) {
    const db = getDatabase();
    db.prepare(`
        INSERT INTO messages (project_path, role, content)
        VALUES (?, ?, ?)
    `).run(projectPath, role, content);
}
function getMessages(projectPath, limit = 50) {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT role, content, created_at as createdAt
        FROM messages
        WHERE project_path = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(projectPath, limit);
    return rows.reverse();
}
function clearMessages(projectPath) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM messages WHERE project_path = ?').run(projectPath);
    return result.changes;
}
//# sourceMappingURL=database.js.map