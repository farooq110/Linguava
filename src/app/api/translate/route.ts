// src/app/api/translate/route.ts
// POST { text, from, to, mode } → { translation, detected? }
// Auth required. Enforces plan limits, saves to chat history, increments usage.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { translateSchema } from '@/lib/validation/schemas';
import { getAuthOptions } from '@/lib/auth/config';
import { getTranslationProvider } from '@/lib/ai';
import { db } from '@/lib/db';
import {
  checkTranslationAllowed,
  incrementUsage,
} from '@/lib/subscription/guard';
import { historyRepo } from '@/lib/repositories/history.repo';
import { getLanguageName } from '@/lib/languages';

export async function POST(req: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = translateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const { text, from, to, mode } = parsed.data;

  const guard = await checkTranslationAllowed({
    userId: session.user.id,
    targetLang: to,
    inputMode: mode,
    textLength: text.length,
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.reason, code: guard.code }, { status: 403 });
  }

  let detected: string | null = null;
  const effectiveFrom = from === 'auto' ? '' : from;
  // Read the user's selected translation model from the session (set in
  // /dashboard/settings). Falls back to 'glm-4-flash' if not set.
  const translationModel = (session.user as any).translationModel ?? 'glm-4-flash';
  if (from === 'auto') {
    try {
      const detection = await getTranslationProvider(translationModel).detectLanguage(text);
      detected = detection.language;
    } catch {
      // Detection failure is non-fatal: fall through to translate() with empty source hint.
    }
  }

  try {
    const translation = await getTranslationProvider(translationModel).translate(
      text,
      detected ?? effectiveFrom,
      to,
    );

    await historyRepo.create({
      userId: session.user.id,
      sourceLang: detected ?? from,
      targetLang: to,
      inputText: text,
      outputText: translation,
      inputMode: mode,
    });
    await incrementUsage(session.user.id, {
      translations: 1,
      characters: text.length,
      voiceUses: mode === 'voice' ? 1 : 0,
    });
    await db.analyticsEvent.create({
      data: {
        userId: session.user.id,
        event: 'translate',
        metadata: JSON.stringify({
          from: detected ?? from,
          to,
          mode,
          chars: text.length,
        }),
      },
    });

    return NextResponse.json({
      translation,
      detected,
      detectedName: detected ? getLanguageName(detected) : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Translation failed. Please try again.' },
      { status: 500 },
    );
  }
}
