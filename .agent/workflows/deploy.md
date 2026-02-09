---
description: Deploy the server to Railway
---

## Deploy to Railway

// turbo-all

1. Push to GitHub (Railway auto-deploys from main branch):
```bash
cd /Users/juniorlaflamme/Documents/Projects/AETHER-Server && git add -A && git commit -m "update" && git push
```

2. Verify deployment:
```bash
curl -s "https://aether-relay-server-production.up.railway.app/health" | jq .
```
