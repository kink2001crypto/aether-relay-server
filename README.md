# AETHER Server

Cloud server for AETHER VS Code Extension and Mobile App.

## Features
- 🔌 WebSocket real-time sync
- 💾 SQLite persistence (projects, messages)  
- 🤖 Multi-AI support (Gemini, OpenAI, Claude)
- 📂 Project file sync from VS Code
- 🖥️ Terminal command relay
- 📝 Git operations relay

## Deploy to Railway

1. Push to GitHub
2. Create new Railway project from GitHub repo
3. Add environment variables:
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY` (optional)
   - `ANTHROPIC_API_KEY` (optional)

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```
