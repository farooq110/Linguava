# Improvement Roadmap — Production Hardening & Feature Additions

The current codebase is a solid, production-shippable reference implementation. To take it from "works" to "scales to 100k users without me getting paged at 3am," work through this list in priority order.

---

## 🔴 Priority 1 — Must-Do Before Real Users

### 1.1 Switch from SQLite to Postgres

SQLite is great for dev but **will not survive a multi-instance deploy** (each serverless function or EC2 instance has its own file system). Move to Postgres on day one.

**How:**
1. Provision Postgres (Vercel Postgres, Neon, Supabase, or RDS).
2. Change `prisma/schema.prisma`: `provider = "postgresql"`.
3. Set `DATABASE_URL` to the Postgres connection string.
4. Run `bun run db:push` against the new DB.
5. Redeploy.

**Time:** 30 minutes. **Cost:** Free on Vercel Postgres / Neon free tier.

---

### 1.2 Wire Up Real Stripe for Subscriptions

The current `/api/subscription` endpoint just flips the `plan` column in the DB. That's fine for demos but won't actually charge anyone.

**How:**
1. `bun add stripe @stripe/stripe-js`
2. Create `src/lib/payment/stripe-provider.ts` implementing the `PaymentProvider` interface already documented in `src/app/api/subscription/route.ts`.
3. Add `/api/stripe/checkout/route.ts` — creates a Stripe Checkout Session, returns the URL. Frontend redirects to it.
4. Add `/api/stripe/webhook/route.ts` — receives `checkout.session.completed` events, calls `userRepo.updatePlan()`.
5. Disable the `POST /api/subscription` direct-plan-change endpoint (or keep it for admin use only).
6. Configure Stripe webhook in the Stripe dashboard → point at `https://yourdomain.com/api/stripe/webhook`.

**Don't forget:** Verify webhook signatures with `stripe.webhooks.constructEvent()` using the Stripe webhook signing secret. Without this, anyone can POST fake events to your webhook.

**Time:** 2–4 hours. **Cost:** Stripe takes 2.9% + 30¢ per transaction.

---

### 1.3 Wire Up Real Email (SMTP or SendGrid)

Password reset currently returns the reset link in the API response (sandbox mode). Real users need real emails.

**How:**
1. Pick a provider:
   - **Resend** (recommended — modern, generous free tier of 100 emails/day)
   - **SendGrid** (enterprise, 100 emails/day free)
   - **AWS SES** (cheapest at scale, $0.10 per 1,000 emails)
   - **Self-hosted Postfix** (don't — deliverability is a nightmare)
2. Replace the TODO block in `src/app/api/auth/forgot-password/route.ts` with a real send call.
3. Remove the `resetUrl` from the JSON response — only show "If that email exists, a reset link is on its way."
4. Add email templates (welcome, password reset, plan upgrade confirmation).

**Time:** 1–2 hours.

---

### 1.4 Set Up Application Monitoring

The in-app `/dashboard/analytics` page is good for user-facing stats, but you need server-side monitoring too. Pick one:

| Tool | Free tier | What it gives you |
|---|---|---|
| **Sentry** | 5k errors/mo | Error tracking + performance + release tracking |
| **Vercel Analytics** | 1k events/mo on free | Web Vitals, page views |
| **PostHog** | 1M events/mo | Product analytics + session replay + feature flags |
| **Logtail / Better Stack** | 1GB logs | Centralized logs with search |

**Recommended combo:** Sentry (errors) + Vercel Analytics (performance) + PostHog (product). All have free tiers that cover a small app.

**How:**
1. `bun add @sentry/nextjs`
2. `bunx @sentry/wizard@latest -i nextjs` — sets up everything automatically.
3. Add `SENTRY_DSN` to env vars.
4. Replace the in-app crash reporter (`src/lib/pwa/crash-reporter.tsx`) with Sentry's `Sentry.captureException` — or keep both, with the in-app one as a fallback for analytics.

**Time:** 1 hour.

---

### 1.5 Add Rate Limiting

The free GLM-4-Flash model rate-limits at the provider level, but you also need app-level rate limiting to prevent abuse:

- ⚠️ Per-IP limit on `/api/demo-translate` — **currently DISABLED** (commented out for launch). The limit code is still in the file, tagged `DEMO LIMIT (disabled)`. To re-enable, see `docs/developer-guide.md` → "Recipe: Re-enabling the Demo Limit". Do this before you have real traffic.
- Per-user limit on `/api/translate` (already enforced via the subscription guard, but consider a stricter per-minute limit too).
- Per-IP limit on `/api/auth/register` and `/api/auth/forgot-password` to prevent enumeration / spam.

**How:**
1. `bun add @upstash/ratelimit @upstash/redis`
2. Create `src/lib/rate-limit.ts`:
   ```ts
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';
   export const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, '1 m'),
   });
   ```
3. Use in API routes:
   ```ts
   const { success } = await ratelimit.limit(`register:${ip}`);
   if (!success) return new Response('Too many requests', { status: 429 });
   ```

**Time:** 1 hour. **Cost:** Free on Upstash free tier (10k requests/day).

---

### 1.6 Add CSRF Protection for Non-GET API Routes

NextAuth handles CSRF for its own routes, but your other API routes (`/api/translate`, `/api/subscription`, etc.) are currently vulnerable to CSRF if a malicious site tricks a logged-in user into POSTing.

**How:**
1. For server actions (which this app doesn't use much yet), Next.js handles CSRF automatically.
2. For client-side `fetch` calls, add a CSRF token to the session and require it in a custom header (`X-CSRF-Token`).
3. Or use the `next-csrf` package.

**Time:** 2 hours.

---

## 🟡 Priority 2 — Scale & Polish

### 2.1 Add a Redis Cache for Translations

If many users translate the same phrase (e.g., "Where is the bathroom?"), cache the result for 24 hours. Big cost savings on AI calls.

**How:**
1. Provision Upstash Redis (free tier).
2. In `src/lib/ai/z-ai-provider.ts`, before calling the SDK:
   ```ts
   const cacheKey = `translate:${from}:${to}:${Buffer.from(text).toString('base64')}`;
   const cached = await redis.get(cacheKey);
   if (cached) return { translation: cached };
   // ... call SDK ...
   await redis.setex(cacheKey, 86400, result.translation);
   ```

**Time:** 1 hour.

---

### 2.2 Add a Translation Queue for Peak Loads

When the free AI provider rate-limits, instead of returning an error to the user, queue the request and process it within 30 seconds. Show a "translating…" state in the UI.

**How:**
1. `bun add bullmq ioredis`
2. Create a queue in `src/lib/queue/translate-queue.ts`.
3. Worker processes jobs with exponential backoff on 429.
4. Frontend uses TanStack Query to poll for the result.

**Time:** 4–6 hours.

---

### 2.3 Switch from NextAuth v4 to Auth.js v5

NextAuth v4 is stable but v5 (Auth.js) has better Edge runtime support, server-action-native flows, and is the future of the project. The adapter pattern in `src/lib/auth/` makes this a contained migration.

**Time:** 4–8 hours depending on how much you've customized.

---

### 2.4 Add Real Web Vitals Reporting

The current `/dashboard/analytics` page mocks "Avg response time." Replace with real Web Vitals (LCP, FID, CLS) reported from the client.

**How:**
1. Use `next/web-vitals` built into Next.js:
   ```ts
   // src/app/layout.tsx
   import { Analytics } from '@vercel/analytics/react';
   ```
2. Or build your own with `reportWebVitals` in `src/app/layout.tsx`.

**Time:** 30 minutes.

---

### 2.5 Add Internationalization (i18n) for the App Itself

The app translates languages for users, but the **app's own UI** is English-only. If you want to reach non-English speakers, internationalize the chrome.

**How:**
1. `next-intl` is already installed in the project.
2. Add locale detection: `/en/dashboard`, `/es/dashboard`, etc.
3. Translate UI strings — there are only ~100 of them.

**Time:** 4 hours for one extra language; 1 hour per additional language.

---

### 2.6 Add a Translation Glossary for Premium Users

Premium plan says "Custom translation glossary" but it's not implemented. Add it:

1. New DB model: `GlossaryEntry { userId, sourceText, targetText, sourceLang, targetLang }`.
2. UI in `/dashboard/settings` to manage entries.
3. In `src/lib/ai/z-ai-provider.ts`, prepend the glossary to the system prompt:
   ```
   Use these translations:
   - "apple" → "manzana"
   - "hello" → "hola"
   Translate the user's text accordingly.
   ```

**Time:** 4 hours.

---

## 🟢 Priority 3 — Nice-to-Haves

### 3.1 Add a Translation History Search

The history page filters by date and language but doesn't full-text search the input/output. Add a search box that uses SQLite FTS5 (or Postgres `tsvector`) to search across all translations.

**Time:** 3 hours.

---

### 3.2 Add an "Export History" Feature

Let users export their translation history as CSV or PDF. Useful for students / business users who need a record.

**How:** Use the `xlsx` or `pdf` skill to generate the file in a server action, return a download URL.

**Time:** 2 hours.

---

### 3.3 Add Offline Translation Mode (PWA)

Currently the PWA works offline for the app shell but translations need a network. For Premium users, download a small on-device translation model (e.g., Google's MediaPipe translator or a quantized version of NLLB-200) so translations work fully offline.

**Time:** 1–2 days. **Reward:** Massive differentiator vs. Google Translate web.

---

### 3.4 Add a Translation Memory (TM) Per User

If a user translates the same source text multiple times, remember the translation they accepted last time and offer it instantly. This is how professional CAT tools (Trados, MemoQ) work.

**Time:** 1 day.

---

### 3.5 Add Browser Extension

A Chrome/Firefox extension that uses the same API for translating selected text on any web page. The extension would need:
- A separate API key system (don't reuse session cookies).
- A simple popup UI.
- Right-click → "Translate with Linguava".

**Time:** 2–3 days.

---

### 3.6 Add Team / Workspace Support

For business users: let a team share a translation glossary, see each other's saved phrases, and have a single subscription that covers multiple seats.

**How:** Add a `Workspace` model, `Membership` join table, and scope queries by workspace ID.

**Time:** 1 week.

---

### 3.7 Add a Public API for Developers

Let other developers use your translation service via an API key. Monetize via the same subscription tiers (Free: 100 req/day, Diamond: 1k/day, Premium: 10k/day).

**How:**
1. Add `ApiKey` model: `{ userId, keyHash, name, lastUsedAt }`.
2. New middleware: `src/lib/auth/api-key.ts` — accepts `Authorization: Bearer <key>`.
3. New route `/api/v1/translate` that accepts API keys instead of session cookies.
4. Docs page at `/developers` with code samples.

**Time:** 2 days. **Reward:** Opens up a B2B revenue stream.

---

## 🛡️ Security Hardening Checklist

- [ ] Set `Secure` and `HttpOnly` flags on all auth cookies (NextAuth v4 does this by default in production — verify).
- [ ] Add `SameSite=Lax` (default) or `SameSite=Strict` to auth cookies.
- [ ] Verify `NEXTAUTH_SECRET` is at least 32 bytes and never committed.
- [ ] Add a Content Security Policy header in `next.config.ts`:
  ```ts
  const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.z.ai;";
  ```
- [ ] Add `X-Frame-Options: DENY` (already in the Nginx config).
- [ ] Run `bunx better-npm-audit audit` in CI to catch vulnerable deps.
- [ ] Enable GitHub branch protection (see `docs/github-actions.md`).
- [ ] Set up Dependabot: `.github/dependabot.yml` with `package-ecosystem: "npm"` and `interval: "weekly"`.
- [ ] Rotate `NEXTAUTH_SECRET` if it ever leaks (this invalidates all sessions).
- [ ] Add IP-based throttling on `/api/auth/*` routes (see 1.5).
- [ ] Sanitize all user input before storing in the DB (Zod does most of this, but consider DOMPurify for any HTML).

---

## 📈 Performance Hardening Checklist

- [ ] Add `Cache-Control: public, max-age=31536000, immutable` to `/_next/static/*` (already in Nginx config).
- [ ] Use `next/dynamic` to lazy-load the analytics charts (Recharts is heavy).
- [ ] Add `loading.tsx` files to dashboard routes for instant loading states.
- [ ] Use `next/image` for any images in the landing page (currently mostly CSS/SVG, which is fine).
- [ ] Preconnect to `api.z.ai` in the layout: `<link rel="preconnect" href="https://api.z.ai" />`.
- [ ] Enable HTTP/3 on your reverse proxy (Caddy supports it natively; Nginx needs `quic` module).
- [ ] Run Lighthouse in CI and fail the build if the score drops below 90.

---

## 🧪 Testing Strategy (Recommended)

The project currently has zero tests. For production, add:

### Unit tests (Vitest)
- Test all repository functions against an in-memory Prisma mock.
- Test all Zod schemas (valid + invalid inputs).
- Test the `TranslationProvider` interface with a mock impl.

### Integration tests (Vitest + supertest)
- Test each API route with a real test DB (separate SQLite file).
- Cover: auth flows, subscription guards, history CRUD, usage limits.

### End-to-end tests (Playwright)
- Critical paths only: register → translate → see in history → upgrade plan.
- Run nightly, not on every PR (slow).

### Visual regression (Chromatic / Playwright snapshots)
- Snapshot the landing, dashboard, translator, history, subscription pages.
- Catch unintended UI changes.

**Setup time:** 1 day for unit + integration; 1 day for E2E; 0.5 day for visual.

---

## 📚 Documentation Additions

- [ ] **API reference** — auto-generate from JSDoc comments using TypeDoc.
- [ ] **Architecture decision records (ADRs)** — `/docs/adr/0001-nextauth-v4-vs-v5.md` etc.
- [ ] **Runbook** — what to do when the AI provider is down, when the DB is slow, when Stripe webhook fails.
- [ ] **Contributing guide** — `CONTRIBUTING.md` with PR template, code style, branch naming.
- [ ] **Changelog** — keep `CHANGELOG.md` updated per release.

---

## Final Word

This codebase is **intentionally simple** so you can understand it end-to-end. Every complexity you add (queues, caching, multi-tenancy) should be in response to a real need — not because "real apps have this." Ship the Priority 1 items, get real users, then let their behavior guide Priority 2 and 3.
