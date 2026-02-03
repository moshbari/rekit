# ⚡ ReKit

Combine leads from multiple sources, scrub duplicates & unsubscribers, send clean lists straight to WebinarKit via n8n. Unsubscribers are stored in Supabase so they persist across all your tools.

---

## Setup (3 Steps)

### Step 1: Create the Supabase Table

1. Go to your Supabase Dashboard > SQL Editor > New Query
2. Paste the contents of SUPABASE_SETUP.sql and click Run
3. Done — your unsubscribers table is ready

### Step 2: Add Your Supabase Credentials

1. Copy .env.example to .env:
   cp .env.example .env

2. Edit .env and fill in your values:
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   Find these at: Supabase Dashboard > Settings > API

### Step 3: Deploy to Cloudflare Pages

Option A — Via GitHub (recommended, auto-deploys on push):
1. Push this project to a GitHub repo
2. Go to Cloudflare Dashboard > Pages > Create a project
3. Connect your GitHub repo
4. Build command: npm run build
5. Build output directory: dist
6. Add environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
7. Click Save and Deploy

Option B — Direct upload:
1. Build locally: npm install && npm run build
2. Go to Cloudflare Dashboard > Pages > Direct Upload
3. Upload the dist folder
4. Note: env vars are baked in at build time with direct upload

---

## Local Development

npm install
npm run dev

Opens at http://localhost:5173
