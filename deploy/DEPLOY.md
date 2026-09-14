# Deployment Structure

```
receipt-scanner-demo/
├── deploy/
│   ├── worker/           # Cloudflare Worker (API + OCR)
│   │   ├── src/
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── migrations/
│   └── frontend/         # Cloudflare Pages (React App)
│       ├── src/
│       ├── public/
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.ts
│       ├── tsconfig*.json
│       └── .env.production
```

# Quick Deploy Commands

## 1. Deploy Worker (run from deploy/worker/)
```bash
cd deploy/worker
npm install
npx wrangler login
npx wrangler d1 create receiptflow-db
# Update wrangler.toml with database_id from output
npx wrangler d1 migrations apply receiptflow-db --remote
npx wrangler deploy
# Copy the worker URL output
```

## 2. Deploy Frontend (Cloudflare Pages)
1. Go to https://dash.cloudflare.com/pages
2. Connect to GitHub → `eyad0103/receipt-scanner-beta`
3. **Build settings:**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `/deploy/frontend` (or `/` if using repo root)
4. **Environment variables (Production):**
   - `VITE_API_BASE` = `https://YOUR_WORKER_URL.workers.dev`
5. **Deploy**

## 3. Verify
- Worker health: `https://YOUR_WORKER_URL.workers.dev/api/health`
- Frontend: `https://YOUR_PROJECT.pages.dev`
- Test register/login/scan

# Current Worker URL
https://receiptflow-api.eyad-amr-ahmed-3000.workers.dev

# Current Frontend URL  
https://receiptflow.pages.dev