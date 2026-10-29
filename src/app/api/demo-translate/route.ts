// src/app/api/demo-translate/route.ts
// Unauthenticated translation for the demo page.
// Uses the same TranslationProvider as the authed endpoint.
//
// ─────────────────────────────────────────────────────────────────────────────
// DEMO RATE LIMIT — CURRENTLY DISABLED
// ─────────────────────────────────────────────────────────────────────────────
// The per-IP rate limit below is commented out so guests can try the demo
// without hitting a 5-translation cap. This is intentional for the launch.
//
// To RE-ENABLE the demo limit in the future, uncomment these three things:
//   1. The MAX_PER_WINDOW and WINDOW_MS constants (search for "DEMO LIMIT").
//   2. The `buckets` Map and `getClientIp()` helper.
//   3. The rate-limit check block inside POST() (search for "RATE LIMIT CHECK").
//   4. In src/components/translator/translator-client.tsx, uncomment the
//      DEMO_MAX_TRANSLATIONS constant, the demoCount state, the three
//      `demoCount` checks inside translate(), the `remaining` useMemo, and
//      the amber "X translations left" banner in the JSX.
//   5. (Optional) Adjust MAX_PER_WINDOW and DEMO_MAX_TRANSLATIONS to the
//      numbers you want (currently 5 per 10-minute window on the API side,
//      5 per session on the client side).
// See docs/developer-guide.md → "Re-enabling the Demo Limit" for full steps.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTranslationProvider } from '@/lib/ai';

const ALLOWED_LANGS = ['ur', 'en', 'es', 'fr', 'de', 'ja'];

// ── DEMO LIMIT (disabled) ──────────────────────────────────────────────────
// const MAX_PER_WINDOW = 5;
// const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
// ────────────────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  text: z.string().min(1).max(500),
  from: z.string().min(2).max(10),
  to: z.enum(['ur', 'en', 'es', 'fr', 'de', 'ja']),
});

// ── DEMO LIMIT (disabled) ──────────────────────────────────────────────────
// In-memory rate limiter. Resets after WINDOW_MS of inactivity per IP.
// const buckets = new Map<string, { count: number; firstAt: number }>();
//
// function getClientIp(req: Request): string {
//   const fwd = req.headers.get('x-forwarded-for');
//   if (fwd) return fwd.split(',')[0]!.trim();
//   return 'unknown';
// }
// ────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  // ── RATE LIMIT CHECK (disabled) ──────────────────────────────────────────
  // To re-enable: uncomment this block AND the constants/helpers above.
  //
  // const ip = getClientIp(req);
  // const now = Date.now();
  // const bucket = buckets.get(ip);
  // if (!bucket || now - bucket.firstAt > WINDOW_MS) {
  //   buckets.set(ip, { count: 1, firstAt: now });
  // } else {
  //   bucket.count += 1;
  //   if (bucket.count > MAX_PER_WINDOW) {
  //     return NextResponse.json(
  //       {
  //         error: 'Demo limit reached. Sign up free to continue translating.',
  //         code: 'demo_limit_reached',
  //       },
  //       { status: 429 },
  //     );
  //   }
  // }
  // ──────────────────────────────────────────────────────────────────────────

  try {
    const translation = await getTranslationProvider().translate(
      parsed.data.text,
      parsed.data.from === 'auto' ? '' : parsed.data.from,
      parsed.data.to,
    );
    return NextResponse.json({ translation });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Translation failed.' },
      { status: 500 },
    );
  }
}

// Exported for tests/type-checks; not used at runtime.
export const _allowedLangs = ALLOWED_LANGS;
