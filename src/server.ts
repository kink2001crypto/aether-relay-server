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

// Health check with detailed status
app.get('/health', (req, res) => {
    const sockets = Array.from(io.sockets.sockets.values());

    res.json({
        status: 'ok',
        name: 'AETHER Server',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connections: sockets.length,
        ai: {
            gemini: !!process.env.GEMINI_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
            claude: !!process.env.ANTHROPIC_API_KEY,
            openrouter: !!process.env.OPENROUTER_API_KEY
        }
    });
});

// Initialize
async function start() {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         🌐 AETHER Server v2.0          ║');
    console.log('║     Cloud Agent System for Dev Tools   ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Init database
    initDatabase();
    console.log('✅ Database ready');

    // Setup API routes
    setupAPI(app, io);
    console.log('✅ API routes ready');

    // Setup WebSocket
    setupWebSocket(io);
    console.log('✅ WebSocket ready');

    // Check AI providers
    const providers = [];
    if (process.env.GEMINI_API_KEY) providers.push('Gemini');
    if (process.env.OPENAI_API_KEY) providers.push('OpenAI');
    if (process.env.ANTHROPIC_API_KEY) providers.push('Claude');
    if (process.env.OPENROUTER_API_KEY) providers.push('OpenRouter');

    if (providers.length === 0) {
        console.log('⚠️  No AI providers configured');
    } else {
        console.log(`✅ AI providers: ${providers.join(', ')}`);
    }

    // Start server
    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log('');
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`   http://localhost:${PORT}/health`);
        console.log('');
    });
}

start().catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
});
