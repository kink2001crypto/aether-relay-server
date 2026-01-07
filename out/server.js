"use strict";
/**
 * 🌐 AETHER Server - Main Entry Point
 * Cloud-ready server for VS Code Extension + Mobile App
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_js_1 = require("./db/database.js");
const websocket_js_1 = require("./websocket.js");
const index_js_1 = require("./api/index.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        name: 'AETHER Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});
// Initialize
async function start() {
    // Init database
    (0, database_js_1.initDatabase)();
    console.log('💾 Database ready');
    // Setup API routes
    (0, index_js_1.setupAPI)(app, io);
    console.log('🔌 API routes ready');
    // Setup WebSocket
    (0, websocket_js_1.setupWebSocket)(io);
    console.log('⚡ WebSocket ready');
    // Start server
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log(`🚀 AETHER Server running on port ${PORT}`);
    });
}
start().catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map