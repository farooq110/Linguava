# Linguava — AI Language Translator

A production-ready, installable (PWA) language translator built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma, and the free **GLM-4-Flash** model via the `z-ai-web-dev-sdk`. Translate 80+ languages with **text or voice input**, smart language validation, 7-day chat history, subscription tiers, and a production analytics dashboard.

> The name **Linguava** = *lingua* (language) + *ava* (available). Swap the name in `src/app/layout.tsx` and `public/manifest.json` if you want.

---

## Highlights

- **Auth** — Sign in, register, forgot/reset password (email-token), Google OAuth. All behind a swappable `AuthProvider` interface so you can swap NextAuth for Clerk/Auth.js v5 by editing one file.
- **Subscription tiers** — Free (English-only, 100/day), Diamond ($9.99, any language, voice input, 1,000/day), Premium ($19.99, unlimited, TTS, 10k chars). All limits driven by `src/lib/subscription/plans.ts`.
- **Translator** — Two-panel UI with source ↔ target language swap, text **and** voice input via Web Speech API, copy button, TTS playback for Premium.
- **Language validation** — The translator calls `/api/detect-language` before translating. If what the user typed/spoke doesn't match the selected source language, a friendly toast tells them what was detected and asks them to switch.
- **80+ languages** — Searchable grid of language cards with emoji flags. Clicking any card drops you into the translator with that language pre-selected as the target.
- **7-day chat history** — Every translation is saved (per plan: Free=7d, Diamond=30d, Premium=90d). Filter by date/language, delete single or clear all.
- **Guest demo** — `/demo` lets visitors try the translator without an account (5 langs). The per-session translation cap is currently **disabled** for launch — to re-enable it, see [`docs/developer-guide.md`](docs/developer-guide.md) → "Recipe: Re-enabling the Demo Limit".
- **Production analytics dashboard** — `/dashboard/analytics` shows daily usage line chart, peak-hours bar chart, crash log table, and uptime badge. Client-side `window.onerror` auto-reports crashes to `/api/analytics/crash`.
- **PWA** — Installable on desktop & mobile, offline-capable service worker, maskable icons, manifest.
- **Loosely coupled adapters everywhere** — Auth, AI, voice, payments, persistence each have an interface. Replace any one without touching the rest. See [`docs/architecture.md`](docs/architecture.md).
- **Forms** — `react-hook-form` + `zod` for every form (sign in, register, forgot/reset password, settings, translator).

---

## Quick Start (Local Dev)

```bash
# 1. Install deps
bun install

# 2. Copy env template and fill in values
cp .env.example .env
# At minimum set NEXTAUTH_SECRET:
#   openssl rand -base64 32

# 3. Push the database schema
bun run db:push

# 4. Run the dev server
bun run dev
# Open http://localhost:3000
```

> The project ships with **Bun** but works with `npm`, `pnpm`, or `yarn` — just swap `bun` for your package manager's command.

### Required env vars

| Variable | Purpose | Required? |
|---|---|---|
| `DATABASE_URL` | SQLite path | ✅ (pre-set to `file:./db/custom.db`) |
| `NEXTAUTH_SECRET` | Session signing secret | ✅ |
| `NEXTAUTH_URL` | App base URL | ✅ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth | Optional — Google button only renders when both are set |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` | Send real password-reset emails | Optional — sandbox returns the reset link in the API response so you can demo the flow without SMTP |

---

## Production Deployments

Step-by-step guides for each platform live in [`docs/`](docs/):

| Where | Guide |
|---|---|
| **Vercel** (recommended, 1-click) | [`docs/deploy-vercel.md`](docs/deploy-vercel.md) |
| **AWS EC2 + Nginx + SSL** | [`docs/deploy-aws-ec2.md`](docs/deploy-aws-ec2.md) |
| **AWS EC2 without Nginx** (bare Node) | [`docs/deploy-aws-ec2-no-nginx.md`](docs/deploy-aws-ec2-no-nginx.md) |
| **CI/CD with GitHub Actions** | [`docs/github-actions.md`](docs/github-actions.md) |
| **Step-by-step developer guide** | [`docs/developer-guide.md`](docs/developer-guide.md) |
| **Architecture & adapter pattern** | [`docs/architecture.md`](docs/architecture.md) |
| **Improvement roadmap** | [`docs/improvements.md`](docs/improvements.md) |

A root-level [`deploy-vercel`](deploy-vercel) script is also included as a quick-reference, per request.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | React Server Components, streaming, edge-ready |
| Language | TypeScript 5 | Type safety across the full stack |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) | Consistent, accessible, themeable |
| Auth | NextAuth.js v4 | Credentials + Google, swappable |
| DB | Prisma + SQLite | Zero-config local dev; swap to Postgres for prod |
| AI | `z-ai-web-dev-sdk` → GLM-4-Flash | Free tier, no API key needed in this sandbox |
| Voice | Web Speech API | Native browser, no SDK install |
| Forms | `react-hook-form` + `zod` | Type-safe schemas, tiny bundle |
| Charts | Recharts | Analytics dashboard |
| State | Zustand + TanStack Query | Client + server state separation |
| PWA | Custom `manifest.json` + `sw.js` | No extra build dependency |

---

## Project Structure

```
.
├── docs/                          # All markdown docs grouped here
│   ├── architecture.md
│   ├── developer-guide.md
│   ├── deploy-aws-ec2.md
│   ├── deploy-aws-ec2-no-nginx.md
│   ├── deploy-vercel.md
│   ├── github-actions.md
│   └── improvements.md
├── .github/workflows/             # CI + deploy pipelines
│   ├── ci.yml
│   └── deploy-vercel.yml
├── prisma/schema.prisma           # DB schema (User, ChatHistory, Usage, CrashReport, …)
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── icons/                     # 192 / 512 / maskable PNGs
├── src/
│   ├── app/                       # App Router pages + API routes
│   │   ├── api/
│   │   │   ├── auth/              # NextAuth + register + forgot/reset password
│   │   │   ├── translate/         # Translation endpoint
│   │   │   ├── detect-language/   # Language validation
│   │   │   ├── history/           # 7-day chat history CRUD
│   │   │   ├── subscription/      # Plan upgrade
│   │   │   ├── usage/             # Daily usage stats
│   │   │   ├── analytics/         # Production analytics
│   │   │   └── analytics/crash/   # Crash report ingest
│   │   ├── dashboard/             # Auth-required app
│   │   ├── sign-in/ register/ forgot-password/ reset-password/
│   │   ├── demo/                  # Guest demo (no auth)
│   │   └── page.tsx               # Landing
│   ├── components/
│   │   ├── auth/ translator/ languages/ subscription/ analytics/ dashboard/ pwa/
│   │   └── ui/                    # shadcn/ui primitives
│   └── lib/
│       ├── ai/                    # TranslationProvider interface + z-ai impl
│       ├── auth/                  # AuthProvider interface + NextAuth config
│       ├── voice/                 # VoiceProvider interface + Web Speech impl
│       ├── repositories/          # All DB access
│       ├── subscription/          # Plan definitions + limit guard
│       ├── languages/             # 82-language dataset
│       ├── validation/            # Zod schemas
│       └── pwa/                   # SW register + crash reporter
├── deploy-vercel                  # Quick-reference deployment helper
├── .env.example
└── README.md
```

---

## Scripts

```bash
bun run dev          # Dev server (port 3000)
bun run lint         # ESLint
bun run build        # Production build (standalone output)
bun run start        # Run the production build
bun run db:push      # Push Prisma schema to SQLite
bun run db:generate  # Regenerate Prisma Client
bun run db:migrate   # Create + apply a migration (prod)
bun run db:reset     # Drop & recreate DB (dev only!)
```

---

## License

MIT — see [`LICENSE`](LICENSE) (create one if you fork). Built as a reference implementation; use it, ship it, learn from it.
