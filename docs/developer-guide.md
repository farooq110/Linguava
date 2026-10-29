# Developer Guide — Step-by-Step

This guide assumes you've just cloned the repo and want to:
1. Run it locally.
2. Understand the codebase well enough to make changes.
3. Add a feature end-to-end.
4. Push your changes through PR → CI → deploy.

---

## Part 1 — Local Setup

### Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | ≥ 20 LTS | Runtime |
| Bun | ≥ 1.0 | Package manager (matches lockfile) |
| Git | ≥ 2.40 | Version control |

You can use npm/pnpm/yarn if you prefer — just delete `bun.lock` and run `npm install` to generate `package-lock.json`. But the project is tuned for Bun.

### Steps

```bash
# 1. Clone
git clone https://github.com/<your-username>/linguava.git
cd linguava

# 2. Install
bun install

# 3. Set up env
cp .env.example .env
# Edit .env — at minimum set NEXTAUTH_SECRET (see below)

# 4. Push the DB schema
bun run db:push

# 5. Start the dev server
bun run dev
# Open http://localhost:3000
```

### Generating `NEXTAUTH_SECRET`

Run any of these and paste the output into `.env`:

```bash
openssl rand -base64 32
# OR
bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# OR
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Part 2 — Codebase Tour

Read [`docs/architecture.md`](architecture.md) first — it explains the adapter pattern that runs through everything. Here's the practical map:

### Where things live

```
src/app/              ← Pages and API routes (App Router)
  page.tsx            ← Landing page (/)
  layout.tsx          ← Root layout (providers, manifest, theme)
  dashboard/          ← Auth-required area
  sign-in/ register/  ← Auth pages
  api/                ← API routes — each in its own folder with route.ts

src/components/       ← React components, grouped by feature
  ui/                 ← shadcn/ui primitives (button, input, card, dialog, …)
  auth/               ← Sign-in/register/forgot-password forms
  translator/         ← Translator UI (panels, voice button, language pickers)
  languages/          ← Language grid + card
  subscription/       ← Plan cards + usage meter
  analytics/          ← Charts + crash log
  dashboard/          ← Sidebar + topbar
  pwa/                ← Install prompt
  providers.tsx       ← Root client providers (Session, Theme, QueryClient, Toaster)

src/lib/              ← Business logic — no JSX except provider components
  ai/                 ← TranslationProvider interface + Z.AI impl
  auth/               ← AuthProvider interface + NextAuth config
  voice/              ← VoiceProvider interface + Web Speech impl
  repositories/       ← All DB access (user, history, usage, analytics)
  subscription/       ← Plan definitions + limit guard
  languages/          ← 82-language dataset
  validation/         ← Zod schemas
  pwa/                ← SW register + crash reporter (JSX, mounted in layout)
  db.ts               ← Prisma client singleton

prisma/
  schema.prisma       ← Database schema

public/               ← Static assets (manifest, icons, sw.js)
docs/                 ← You are here
.github/workflows/    ← CI/CD pipelines
```

### How a translation flows through the app

```
User types "Hola" in Spanish → clicks Translate
       ↓
src/components/translator/translator-client.tsx
       ↓ fetch POST /api/translate { text: 'Hola', from: 'es', to: 'en' }
src/app/api/translate/route.ts
       ↓ getServerSession() — must be logged in
       ↓ subscription guard: can user translate to 'en'? (free plan: yes)
       ↓ usage guard: under daily limit?
       ↓
src/lib/ai/index.ts → getTranslationProvider()
       ↓
src/lib/ai/z-ai-provider.ts → ZAI.create() → chat.completions.create()
       ↓ returns "Hello"
       ↓
src/lib/repositories/history.repo.ts → create()
       ↓ saves to ChatHistory table
       ↓
src/lib/repositories/usage.repo.ts → increment()
       ↓ bumps today's Usage row
       ↓
Returns { translation: 'Hello' } to the client
       ↓
React component updates the output panel
```

### How to find any piece of code

| I want to change … | Go to … |
|---|---|
| The list of languages | `src/lib/languages/index.ts` |
| Plan prices or limits | `src/lib/subscription/plans.ts` |
| The AI model used | `src/lib/ai/z-ai-provider.ts` (`model: 'glm-4-flash'`) |
| The auth provider (e.g., swap to Clerk) | `src/lib/auth/config.ts` |
| The translation endpoint logic | `src/app/api/translate/route.ts` |
| The translator UI | `src/components/translator/translator-client.tsx` |
| Landing page copy | `src/app/page.tsx` |
| Sidebar menu items | `src/components/dashboard/sidebar.tsx` |
| Database schema | `prisma/schema.prisma` (then run `bun run db:push`) |
| The PWA manifest | `public/manifest.json` |
| The service worker | `public/sw.js` |

---

## Part 3 — Adding a Feature End-to-End

Let's say you want to add a **"Phrasebook"** feature: users can star a translation to save it to a separate saved list.

### Step 1: Update the schema

Edit `prisma/schema.prisma`:

```prisma
model SavedPhrase {
  id          String   @id @default(cuid())
  userId      String
  sourceLang  String
  targetLang  String
  inputText   String
  outputText  String
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
}

// And add to User model:
model User {
  // ... existing fields ...
  savedPhrases SavedPhrase[]
}
```

Push the schema:

```bash
bun run db:push
```

### Step 2: Create the repository

Create `src/lib/repositories/saved-phrase.repo.ts`:

```ts
import { db } from '@/lib/db';

export const savedPhraseRepo = {
  async list(userId: string) {
    return db.savedPhrase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    userId: string;
    sourceLang: string;
    targetLang: string;
    inputText: string;
    outputText: string;
  }) {
    return db.savedPhrase.create({ data });
  },

  async delete(id: string, userId: string) {
    return db.savedPhrase.deleteMany({ where: { id, userId } });
  },
};
```

Add it to `src/lib/repositories/index.ts`:

```ts
export { savedPhraseRepo } from './saved-phrase.repo';
```

### Step 3: Add the API routes

Create `src/app/api/saved-phrases/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { savedPhraseRepo } from '@/lib/repositories';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const phrases = await savedPhraseRepo.list(session.user.id);
  return NextResponse.json({ phrases });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const phrase = await savedPhraseRepo.create({
    userId: session.user.id,
    ...body,
  });
  return NextResponse.json({ phrase });
}
```

Create `src/app/api/saved-phrases/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { savedPhraseRepo } from '@/lib/repositories';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  await savedPhraseRepo.delete(id, session.user.id);
  return NextResponse.json({ ok: true });
}
```

### Step 4: Add the UI

Add a "Save" button to `src/components/translator/translation-output.tsx`:

```tsx
'use client';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

export function TranslationOutput({ /* existing props */ }) {
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const res = await fetch('/api/saved-phrases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLang, targetLang, inputText, outputText,
      }),
    });
    if (res.ok) {
      setSaved(true);
      toast.success('Saved to phrasebook');
    } else {
      toast.error('Could not save');
    }
  }

  return (
    <div>
      {/* existing output text */}
      <Button variant="ghost" size="sm" onClick={handleSave} disabled={saved}>
        <Star className={saved ? 'fill-current' : ''} />
        {saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  );
}
```

Create `src/app/dashboard/phrasebook/page.tsx` for the list view — model it on `src/app/dashboard/history/page.tsx`.

Add a "Phrasebook" item to the sidebar in `src/components/dashboard/sidebar.tsx`.

### Step 5: Verify locally

```bash
bun run lint        # Should pass
bun run dev         # Click around, save a phrase, view it in /dashboard/phrasebook
```

### Step 6: Commit & push

```bash
git checkout -b feat/phrasebook
git add .
git commit -m "feat: add phrasebook (save starred translations)"
git push -u origin feat/phrasebook
```

Open a PR on GitHub. CI runs automatically. Merge when green. Vercel auto-deploys.

---

## Part 4 — Common Recipes

### Recipe: Add a new language

Edit `src/lib/languages/index.ts`:

```ts
{ code: 'xx', name: 'New Language', nativeName: 'Native Name', flag: '🇽🇽', rtl: false }
```

That's it. The language list, dropdowns, and translator automatically pick it up. If the AI model can't handle it, translations will fail gracefully with a toast.

### Recipe: Change the free plan's daily limit

Edit `src/lib/subscription/plans.ts`:

```ts
free: {
  // ...
  limits: {
    dailyTranslations: 200,  // ← was 100
    // ...
  },
}
```

The change is picked up immediately — no DB migration, no rebuild needed beyond the normal deploy.

### Recipe: Add a new auth provider (e.g., GitHub OAuth)

1. `src/lib/auth/options.ts` — import `GitHubProvider` from `next-auth/providers/github`, add to `providers` array (guarded by env var presence, same pattern as Google).
2. `.env.example` — add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
3. Create a GitHub OAuth app at <https://github.com/settings/developers>. Callback URL: `https://yourdomain.com/api/auth/callback/github`.
4. Add the button to `src/components/auth/sign-in-form.tsx` mirroring the Google button pattern.

### Recipe: Replace the AI provider with DeepL

See `docs/architecture.md` → "How to swap to DeepL". It's literally 3 file changes.

### Recipe: Add a new API endpoint

1. Create the folder: `src/app/api/<name>/route.ts`.
2. Export `GET` / `POST` / etc. functions. They receive a `Request` and return a `Response` (or `NextResponse`).
3. Always authenticate first: `const session = await getServerSession(authOptions); if (!session?.user?.id) return 401;`.
4. Use repositories for DB access — never call Prisma directly from a route.

### Recipe: Run database migrations in production

The dev workflow uses `bun run db:push` (which syncs schema without history). For production with Postgres:

```bash
# Create a migration from your local schema changes
bun run db:migrate -- --name add_saved_phrases

# This creates prisma/migrations/<timestamp>_add_saved_phrases/

# Apply migrations against the prod DB (run from your laptop, with DATABASE_URL pointing at prod)
DATABASE_URL="postgresql://..." bunx prisma migrate deploy
```

Always run `migrate deploy` (not `migrate dev`) against production — it skips the interactive prompts.

### Recipe: Re-enabling the Demo Limit

The guest demo page (`/demo`) currently has **no translation cap** — guests can translate as many times as they want. The limit code is still in the codebase but commented out, so you can re-enable it in a few minutes when you're ready to push visitors toward sign-up.

The limit has two layers (both must be re-enabled for full coverage):

| Layer | File | What it does |
|---|---|---|
| **Server-side** | `src/app/api/demo-translate/route.ts` | Per-IP rate limit: 5 translations per 10-minute window. Returns HTTP 429 with `code: 'demo_limit_reached'`. |
| **Client-side** | `src/components/translator/translator-client.tsx` | Per-session counter: 5 translations per page load. Shows the amber "X translations left" banner and pre-empts the API call. |

#### Step-by-step re-enable

**1. Server-side** — open `src/app/api/demo-translate/route.ts` and uncomment every block tagged `DEMO LIMIT (disabled)` or `RATE LIMIT CHECK (disabled)`:

```ts
// Uncomment these constants:
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Uncomment the buckets Map and getClientIp() helper:
const buckets = new Map<string, { count: number; firstAt: number }>();
function getClientIp(req: Request): string { ... }

// Uncomment the rate-limit check block inside POST():
const ip = getClientIp(req);
const now = Date.now();
const bucket = buckets.get(ip);
if (!bucket || now - bucket.firstAt > WINDOW_MS) {
  buckets.set(ip, { count: 1, firstAt: now });
} else {
  bucket.count += 1;
  if (bucket.count > MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: 'Demo limit reached. Sign up free to continue translating.', code: 'demo_limit_reached' },
      { status: 429 },
    );
  }
}
```

**2. Client-side** — open `src/components/translator/translator-client.tsx` and uncomment every block tagged `DEMO LIMIT (disabled)`:

- The `DEMO_MAX_TRANSLATIONS` constant near the top.
- The `demoCount` state declaration (`const [demoCount, setDemoCount] = useState(0);`).
- The pre-flight check inside `translate()` that blocks the API call when `demoCount >= DEMO_MAX_TRANSLATIONS`.
- The `demo_limit_reached` handler inside the `if (!res.ok)` block.
- The `setDemoCount((c) => c + 1)` increment after a successful translation.
- The `remaining` useMemo.
- The `{remaining} translation{remaining === 1 ? '' : 's'} left.` text inside the amber banner JSX.
- Re-add `useMemo` to the React import on line 11 (it was removed when the limit was disabled).

**3. (Optional) Tune the numbers.** Change `MAX_PER_WINDOW` (server) and `DEMO_MAX_TRANSLATIONS` (client) to whatever caps you want. They don't have to match — the server cap is per-IP per-10-minutes, the client cap is per-page-load.

**4. Test locally.**

```bash
bun run dev
# Open http://localhost:3000/demo and translate 6 times.
# The 6th should show "Demo limit reached. Sign up free to continue."
```

**5. Deploy.** Commit and push — your CI/CD pipeline (see `docs/github-actions.md`) will deploy the change.

> **Why two layers?** The client-side cap gives instant feedback (no network round-trip) and saves API quota. The server-side cap is the real enforcement — a savvy user could otherwise bypass the client check with browser DevTools. Keep both enabled for real protection.

---

## Part 5 — Debugging Tips

### Inspect the SQLite DB

```bash
bunx prisma studio
# Opens a web UI at http://localhost:5555 — browse all tables, edit data
```

### See what queries Prisma is running

The dev log already shows Prisma queries (you saw them in `dev.log`). To make them more readable:

```bash
# Filter for just the query text
grep "prisma:query" dev.log | tail -50
```

### Debug the translator flow

Add temporary `console.log` statements in:
- `src/app/api/translate/route.ts` (after each guard, before the AI call)
- `src/lib/ai/z-ai-provider.ts` (right before the SDK call — log the messages array)

Then watch `dev.log`:
```bash
tail -f dev.log | grep -v "^prisma:query"
```

### Test the AI provider in isolation

```bash
bun -e "
import { getTranslationProvider } from './src/lib/ai/index';
const p = getTranslationProvider();
const r = await p.translate({ text: 'Hola mundo', from: 'es', to: 'en' });
console.log(r);
"
```

### Reset the DB to a clean state

```bash
# ⚠️ Destructive — only in dev
rm db/custom.db db/custom.db-journal
bun run db:push
```

### Service worker not updating?

Service workers are aggressively cached by the browser. To force-update during dev:
1. DevTools → Application → Service Workers → "Unregister".
2. DevTools → Application → Storage → "Clear site data".
3. Hard reload (Ctrl+Shift+R / Cmd+Shift+R).

In production, the SW file is served with `Cache-Control: no-cache` (see the Nginx/Caddy configs), so updates propagate within 24 hours automatically.

---

## Part 6 — Code Style & Conventions

- **TypeScript everywhere.** No `any` without a comment explaining why.
- **`'use client'` only when needed.** Pages and route handlers are server by default. Mark components `'use client'` only if they use hooks, state, or browser APIs.
- **Use shadcn/ui components.** Don't reinvent buttons, dialogs, inputs. If you need a new shadcn component: `bunx shadcn@latest add <component>`.
- **Repository pattern for DB.** Never call `db.user.findMany()` from a route. Always go through `userRepo.find()`.
- **Validate all input.** Use Zod schemas from `src/lib/validation/schemas.ts` for every API request body.
- **Toast for user feedback.** Use `import { toast } from 'sonner'`. Success = green, error = red, info = blue.
- **No emojis in code or UI text** — except language flags (which are data, not decoration).
- **Comment "why", not "what".** Code should explain itself; comments explain decisions.

---

## Part 7 — Where to Go Next

- [`docs/architecture.md`](architecture.md) — Deep dive on the adapter pattern.
- [`docs/improvements.md`](improvements.md) — Roadmap of improvements for production hardening.
- [`docs/deploy-vercel.md`](deploy-vercel.md) — Ship to production in 5 minutes.
- [`docs/deploy-aws-ec2.md`](deploy-aws-ec2.md) — Self-host on AWS.
- [`docs/github-actions.md`](github-actions.md) — Set up CI/CD.
