# Architecture & Loosely-Coupled Adapter Pattern

This document explains how the codebase is organized so that **any single third-party dependency can be swapped without rewriting the rest of the app**. This is the single most important architectural decision in the project.

---

## The Adapter Pattern, In One Diagram

```
                    ┌─────────────────────────────────────┐
                    │   React Components / API Routes     │
                    │   (only ever talk to interfaces)    │
                    └──────┬──────────┬──────────┬────────┘
                           │          │          │
                  ┌────────▼──┐  ┌────▼────┐  ┌─▼──────────┐
                  │Translation│  │  Auth   │  │  Voice     │
                  │ Provider  │  │ Provider│  │  Provider  │
                  │ interface │  │interface│  │ interface  │
                  └────┬──────┘  └────┬────┘  └─────┬──────┘
                       │              │              │
              ┌────────┴───────┐      │        ┌─────┴──────┐
              │                │      │        │            │
        ┌─────▼─────┐   ┌──────▼──┐ ┌─▼──────┐ ┌▼─────────┐ ┌▼──────────┐
        │Z.AI SDK   │   │(future) │ │NextAuth│ │(future)  │ │Web Speech │
        │GLM-4-Flash│   │DeepL    │ │v4      │ │Azure     │ │API        │
        │(default)  │   │Google   │ │(default│ │Speech    │ │(default)  │
        │           │   │OpenAI   │ │)       │ │Whisper   │ │           │
        └───────────┘   └─────────┘ └────────┘ └──────────┘ └───────────┘
```

The same pattern applies to:
- **Persistence** → `src/lib/repositories/*.repo.ts` (swap SQLite/Prisma → Postgres/Mongo)
- **Payments** → documented inline in `src/app/api/subscription/route.ts` (swap mock → Stripe)
- **Email** → `src/app/api/auth/forgot-password/route.ts` (swap mock link → nodemailer/SendGrid)

---

## 1. Translation Provider

### Interface — `src/lib/ai/translation-provider.ts`

```ts
export interface TranslationProvider {
  translate(input: {
    text: string;
    from: string; // ISO 639-1 code, e.g. 'es'
    to:   string;
  }): Promise<{ translation: string; detectedFrom?: string }>;

  detectLanguage(text: string): Promise<{ language: string; confidence: number }>;
}
```

### Default implementation — `src/lib/ai/z-ai-provider.ts`

Uses `z-ai-web-dev-sdk` → `ZAI.create()` → `zai.chat.completions.create({ model: 'glm-4-flash', messages })`. The free GLM-4-Flash model is used with a system prompt that forces "translation only, no commentary." The provider strips quote characters and parses JSON defensively for the `detectLanguage` call.

### Factory — `src/lib/ai/index.ts`

```ts
import { ZAiTranslationProvider } from './z-ai-provider';
import type { TranslationProvider } from './translation-provider';

let _provider: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (!_provider) {
    // 👇 Swap this single line to change providers app-wide.
    _provider = new ZAiTranslationProvider();
  }
  return _provider;
}
```

### How to swap to DeepL (example)

1. `bun add deepl`
2. Create `src/lib/ai/deepl-provider.ts`:
   ```ts
   import { Translator } from 'deepl';
   import type { TranslationProvider } from './translation-provider';

   export class DeepLTranslationProvider implements TranslationProvider {
     private client = new Translator(process.env.DEEPL_API_KEY!);

     async translate({ text, from, to }) {
       const result = await this.client.translateText(text, from, to);
       return { translation: result.text, detectedFrom: result.detectedSourceLang };
     }

     async detectLanguage(text: string) {
       // DeepL doesn't have a standalone detect endpoint —
       // do a no-op translate to a known lang and read detectedSourceLang.
       const r = await this.client.translateText(text, null, 'en');
       return { language: r.detectedSourceLang ?? 'un', confidence: 0.9 };
     }
   }
   ```
3. In `src/lib/ai/index.ts` change the `new ZAiTranslationProvider()` line to `new DeepLTranslationProvider()`.
4. Add `DEEPL_API_KEY=...` to `.env`.

**Zero changes to any component, route, or repo.**

---

## 2. Auth Provider

### Interface — `src/lib/auth/auth-provider.ts`

```ts
export interface AuthProvider {
  // Returns a NextAuth-compatible options object.
  getOptions(): NextAuthOptions;
  // Returns the NextAuth session helper for server components.
  getServerSession(): Promise<Session | null>;
}
```

### Default implementation — `src/lib/auth/options.ts`

Wires `CredentialsProvider` (email + bcrypt-hashed password) and `GoogleProvider` (only registered when env vars are present). Uses Prisma as the session/user store.

### How to swap to Clerk (example)

1. `bun add @clerk/nextjs`
2. Create `src/lib/auth/clerk-provider.ts` implementing `AuthProvider` — `getOptions()` can throw or be a no-op since Clerk doesn't use NextAuth, and `getServerSession()` returns the Clerk user mapped to the same `Session` shape.
3. In `src/lib/auth/config.ts` (the single file everything imports from) change `export const authProvider = new NextAuthProvider()` → `export const authProvider = new ClerkAuthProvider()`.
4. Replace the `<SessionProvider>` in `src/components/providers.tsx` with `<ClerkProvider>`.

Routes that import `getServerSession` from `@/lib/auth/config` keep working unchanged.

---

## 3. Voice Provider

### Interface — `src/lib/voice/types.ts`

```ts
export interface VoiceProvider {
  isSupported(): boolean;
  start(lang: string): void;
  stop(): void;
  onResult(cb: (transcript: string, isFinal: boolean) => void): void;
  onError(cb: (err: Error) => void): void;
}
```

### Default implementation — `src/lib/voice/speech-recognition.ts`

Wraps `window.SpeechRecognition` / `window.webkitSpeechRecognition` with the standard Web Speech API.

### How to swap to Azure Speech

1. `bun add microsoft-cognitiveservices-speech-sdk`
2. Create `src/lib/voice/azure-speech.ts` implementing `VoiceProvider`.
3. In `src/components/translator/voice-input-button.tsx` change `new WebSpeechProvider()` → `new AzureSpeechProvider()` (or use a factory function the same way the AI provider does).

---

## 4. Repositories (Persistence Layer)

All database access goes through repository files in `src/lib/repositories/`:

| File | Methods |
|---|---|
| `user.repo.ts` | `findByEmail`, `findById`, `create`, `updatePlan`, `updatePassword` |
| `history.repo.ts` | `create`, `listForUser(days)`, `delete(id, userId)`, `clearAll(userId)` |
| `usage.repo.ts` | `increment(userId, ...)`, `getToday(userId)`, `getRange(userId, from, to)` |
| `analytics.repo.ts` | `logEvent`, `logCrash`, `getOverview(userId)`, `listCrashes(userId)` |

Each function takes a Prisma client as the first argument (defaulting to the singleton from `src/lib/db.ts`). To swap to Postgres, run `prisma migrate` with a new `DATABASE_URL` and **no code changes**. To swap to a totally different ORM (Drizzle, Mongoose), reimplement these functions and the rest of the app doesn't notice.

---

## 5. Payments

`src/app/api/subscription/route.ts` contains a documented `PaymentProvider` interface and a `MockPaymentProvider` implementation that just updates the DB. To wire Stripe:

1. `bun add stripe @stripe/stripe-js`
2. Create `src/lib/payment/stripe-provider.ts` implementing `PaymentProvider`:
   ```ts
   export interface PaymentProvider {
     createCheckoutSession(userId: string, plan: PlanId, successUrl: string, cancelUrl: string): Promise<{ url: string }>;
     handleWebhook(req: Request): Promise<Response>;
   }
   ```
3. Add a webhook route at `src/app/api/stripe/webhook/route.ts`.
4. Change `POST /api/subscription` to redirect to the Stripe checkout URL.
5. The webhook handler calls `userRepo.updatePlan(userId, plan)` on `checkout.session.completed`.

---

## 6. Email

`src/app/api/auth/forgot-password/route.ts` has a clearly-marked TODO block. The current behavior generates a reset token, saves it, and returns the reset URL in the JSON response (so the sandbox UI can show it as a toast). To send real emails:

1. `bun add nodemailer`
2. Add SMTP env vars (already in `.env.example`).
3. Replace the TODO with:
   ```ts
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: Number(process.env.SMTP_PORT),
     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
   });
   await transporter.sendMail({
     from: process.env.FROM_EMAIL,
     to: email,
     subject: 'Reset your Linguava password',
     text: `Reset link: ${resetUrl}`,
   });
   ```
4. Remove the `resetUrl` from the JSON response.

---

## Why This Matters

- **Vendor lock-in is the #1 cause of "rewrite the whole app" decisions.** Every external service here is one file away from being replaced.
- **Testing is trivial.** Mock any provider interface in unit tests; no SDK stubs needed.
- **A/B testing providers is possible.** Switch on a feature flag in the factory function.
- **Cost control.** When GLM-4-Flash rate-limits you (see "Rate Limits" below), swap to DeepL or Google in 5 minutes.

---

## Rate Limits & Quirks of the Default AI Provider

- `glm-4-flash` is free but rate-limited (~5 requests/minute under load). The provider catches HTTP 429 and surfaces a friendly toast: "Translation service is busy — please try again in a moment."
- The model occasionally wraps output in quotes. The provider strips leading/trailing `"` `'` characters.
- For language detection, the model is asked to return JSON. The provider extracts the first `{...}` block defensively.
- For production scale, either: (a) upgrade to a paid Z.AI model, (b) swap to DeepL/Google (see above), or (c) add a queue (BullMQ + Redis) so users get "queued, result in 30s" instead of an error.
