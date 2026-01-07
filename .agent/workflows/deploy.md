---
description: Deploy the server to Railway
---

## Deploy to Railway

// turbo-all

1. Build the server:
```bash
cd /Users/juniorlaflamme/AETHER-Server && npm run build
```

2. Commit changes:
```bash
git add -A && git commit -m "update"
```

3. Push to GitHub (Railway auto-deploys):
```bash
git push
```

4. Verify deployment:
```bash
curl -s "https://aether-relay-server-production.up.railway.app/health" | jq .
```
