/**
 * 🌐 AETHER Server - Main Entry Point
 * Cloud-ready server for VS Code Extension + Mobile App
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import { setupWebSocket } from './websocket.js';
import { setupAPI } from './api/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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
    initDatabase();
    console.log('💾 Database ready');

    // Setup API routes
    setupAPI(app, io);
    console.log('🔌 API routes ready');

    // Setup WebSocket
    setupWebSocket(io);
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
