// src/app/api/detect-language/route.ts
// POST { text } → { language, confidence, name }
// Auth required (so anonymous users can't burn AI quota).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getAuthOptions } from '@/lib/auth/config';
import { getTranslationProvider } from '@/lib/ai';
import { getLanguageName } from '@/lib/languages';

const bodySchema = z.object({ text: z.string().min(1).max(5000) });

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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter some text first' }, { status: 400 });
  }
  try {
    const result = await getTranslationProvider().detectLanguage(parsed.data.text);
    return NextResponse.json({
      language: result.language,
      confidence: result.confidence,
      name: getLanguageName(result.language),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Could not detect language' },
      { status: 500 },
    );
  }
}
