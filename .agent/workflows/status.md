---
description: Check server status and projects
---

## Check Server Status

// turbo-all

1. Health check:
```bash
curl -s "https://aether-relay-server-production.up.railway.app/health" | jq .
```

2. Check connected clients:
```bash
curl -s "https://aether-relay-server-production.up.railway.app/api/sync/status" | jq .
```

3. List synced projects:
```bash
curl -s "https://aether-relay-server-production.up.railway.app/api/sync/vscode-projects" | jq .
```
