# Deploy to Vercel — Step-by-Step Developer Guide

Vercel is the **recommended** deployment platform for this project. The Next.js standalone build, zero-config Prisma support, and automatic HTTPS make it the fastest path to production. Expect **~5 minutes** from git push to live URL.

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier is fine).
- The project pushed to GitHub / GitLab / Bitbucket.
- (Optional) A custom domain registered with any registrar.

---

## Step 1 — Push the project to GitHub

```bash
# From the project root
git init
git add .
git commit -m "Initial commit: Linguava translator"
git branch -M main
git remote add origin https://github.com/<your-username>/linguava.git
git push -u origin main
```

> If you haven't already created the empty repo on GitHub, do it first: `gh repo create linguava --public --source=. --push` (requires the `gh` CLI).

---

## Step 2 — Generate a NextAuth secret

You need a random string for `NEXTAUTH_SECRET`. Generate one locally:

```bash
openssl rand -base64 32
# Example output: K7x9pQ2vR8sT3uW1yZ0aB4cD6eF8gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6q
```

Copy this value — you'll paste it into Vercel in Step 4.

---

## Step 3 — Import the repo into Vercel

1. Go to <https://vercel.com/new>.
2. Under "Import Git Repository", find `linguava` and click **Import**.
3. Vercel auto-detects Next.js — leave the Build & Output Settings at defaults:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (Vercel runs `bun run build` automatically — it detects `bun.lock`)
   - **Output Directory:** `.next` (auto)
   - **Install Command:** `bun install` (auto-detected from `bun.lock`)

> If Vercel doesn't auto-detect Bun, set **Install Command** to `bun install` and **Build Command** to `bun run build` manually under "Settings → General".

---

## Step 4 — Configure Environment Variables

On the same "Configure Project" page (or later under **Settings → Environment Variables**), add each variable:

| Key | Value | Environments |
|---|---|---|
| `DATABASE_URL` | `file:./db/custom.db` (default SQLite) **OR** a Postgres URL (see Step 6) | Production, Preview, Development |
| `NEXTAUTH_SECRET` | The string from Step 2 | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://<your-project>.vercel.app` (Vercel auto-set after first deploy; you can leave blank for the first deploy) | Production |
| `GOOGLE_CLIENT_ID` | (optional) From Google Cloud Console → see below | Production |
| `GOOGLE_CLIENT_SECRET` | (optional) | Production |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `FROM_EMAIL` | (optional) For real password-reset emails | Production |

Click **Deploy**. Vercel now builds the app — typically 60–90 seconds.

> **Note on `NEXTAUTH_URL`:** For preview deployments, NextAuth v4 needs the URL to match the request origin. The app already handles this with a dynamic check in `src/lib/auth/options.ts`. You can safely leave `NEXTAUTH_URL` unset if you only ever use Vercel preview URLs.

---

## Step 5 — First Deploy & Smoke Test

1. When the build finishes, Vercel shows a green "Congratulations" page with your production URL: `https://linguava-<your-handle>.vercel.app`.
2. Click the URL. Verify:
   - Landing page loads with the hero, language marquee, and pricing cards.
   - Click **Try Demo** → translator works (may rate-limit after 5 requests — that's expected).
   - Click **Get Started Free** → register a test user → you're redirected to `/dashboard`.
   - Try translating a Spanish sentence to English.
3. If anything fails, click **Logs** in the Vercel dashboard to see real-time server logs.

---

## Step 6 — (Strongly Recommended) Switch to Postgres

SQLite on Vercel works for a quick demo but **doesn't persist across serverless invocations** reliably (the file system is ephemeral). For real production use, switch to Postgres:

### Option A — Vercel Postgres (easiest)

1. In the Vercel dashboard, go to **Storage → Create Database → Postgres**.
2. Name it `linguava-prod`, select your region, click Create.
3. Click **Connect to Project** → select `linguava`.
4. Vercel auto-adds `POSTGRES_URL` and related env vars. Override `DATABASE_URL` to use it:
   - Key: `DATABASE_URL`
   - Value: `postgresql://...` (the connection string Vercel shows under ".env.local" tab)
5. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"   // ← changed from sqlite
     url      = env("DATABASE_URL")
   }
   ```
6. Push the schema:
   ```bash
   # Local, with DATABASE_URL set to the Vercel Postgres URL in your .env
   bun run db:push
   ```
7. Redeploy. Vercel auto-redeploys on push, or click **Redeploy** in the dashboard.

### Option B — Neon / Supabase / Railway Postgres

Create a free Postgres DB on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app). Copy the connection string into `DATABASE_URL` on Vercel and follow the same `prisma/schema.prisma` change.

---

## Step 7 — (Optional) Configure Google OAuth

1. Go to <https://console.cloud.google.com/> → create a project (or reuse an existing one).
2. **APIs & Services → OAuth consent screen:**
   - User type: External
   - App name: Linguava
   - Support email: your email
   - Authorized domains: `vercel.app` and any custom domain you'll add
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID:**
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local dev)
     - `https://linguava-<your-handle>.vercel.app`
     - `https://<your-custom-domain>` (if you have one)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://linguava-<your-handle>.vercel.app/api/auth/callback/google`
4. Copy the **Client ID** and **Client Secret** into Vercel env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
5. Redeploy. The "Continue with Google" button now appears on `/sign-in` and `/register`.

---

## Step 8 — (Optional) Add a Custom Domain

1. In Vercel: **Settings → Domains → Add** → enter your domain (e.g., `linguava.yourdomain.com`).
2. Vercel shows you DNS records to add at your registrar:
   - `A` record or `CNAME` pointing to Vercel's edge.
3. Once DNS propagates (minutes to hours), Vercel issues a TLS cert automatically.
4. Update these env vars to match the new domain:
   - `NEXTAUTH_URL=https://linguava.yourdomain.com`
   - In Google Cloud Console, add the new domain to authorized origins/redirects.

---

## Step 9 — (Optional) Enable Vercel Analytics / Speed Insights

1. `bun add @vercel/analytics @vercel/speed-insights`
2. In `src/app/layout.tsx`, add at the bottom of `<body>`:
   ```tsx
   import { Analytics } from '@vercel/analytics/react';
   import { SpeedInsights } from '@vercel/speed-insights/react';
   // ...
   <Analytics />
   <SpeedInsights />
   ```
3. Push. Vercel now collects Web Vitals + page views in the dashboard.

This **complements** (does not replace) the in-app `/dashboard/analytics` page.

---

## Step 10 — Set Up Automatic Preview Deploys

Every push to any branch other than `main` triggers a **Preview Deployment** with a unique URL. Use this for PR reviews:

1. Open a PR against `main`.
2. Vercel posts a preview URL as a GitHub check.
3. Reviewers click the URL, test the change, approve.
4. Merge → Vercel promotes the same build to Production.

---

## Troubleshooting

### "Environment variable NEXTAUTH_SECRET is missing"
You forgot Step 2/4. Add it under **Settings → Environment Variables** and redeploy.

### Prisma error: "Schema Engine permission denied"
You're trying to run `prisma migrate` against Vercel's ephemeral file system. Run `bun run db:push` **locally** with `DATABASE_URL` set to your Postgres connection string. The schema will be pushed to the live DB; Vercel just reads from it.

### Google OAuth redirects to localhost
The `redirect_uri` in the Google request must **exactly match** one of the URIs in the Google Cloud Console. Check for trailing slashes, http vs https, and www vs non-www.

### Build fails with "Cannot find module 'sharp'"
Vercel should install it automatically. If not, add `"sharp": "^0.34.0"` to `dependencies` in `package.json` (not `devDependencies`) and redeploy.

### Translations return 429 (rate limit)
The default `glm-4-flash` model rate-limits under load. Either:
- Upgrade to a paid Z.AI model.
- Swap to DeepL (see `docs/architecture.md`).
- Add request throttling in `src/lib/ai/z-ai-provider.ts`.

---

## Reference: Vercel Project Settings Summary

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` (default) |
| Build Command | `bun run build` (auto-detected) |
| Output Directory | `.next` (auto) |
| Install Command | `bun install` (auto) |
| Node.js Version | 20.x (Vercel default; works with 22.x too) |
| Serverless Function Region | Default (iad1) — change to your users' nearest region |

---

## Quick Deploy Button

If you fork this repo and want others to deploy it instantly, add this to your README:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<your-username>%2Flinguava&env=NEXTAUTH_SECRET,NEXTAUTH_URL,DATABASE_URL&envDescription=Secrets%20required%20to%20run%20the%20app&project-name=linguava&repository-name=linguava)
```

That's it. Welcome to production.
