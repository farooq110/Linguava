// src/app/api/settings/route.ts
// Update current user's profile + translator defaults + model selections.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getAuthOptions } from '@/lib/auth/config';
import { userRepo } from '@/lib/repositories/user.repo';
import { TRANSLATION_MODELS, VOICE_MODELS } from '@/lib/models/registry';

const bodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  preferredLang: z.string().min(2).max(10).optional(),
  defaultSourceLang: z.string().min(2).max(10).optional(),
  defaultTargetLang: z.string().min(2).max(10).optional(),
  translationModel: z.enum(TRANSLATION_MODELS.map((m) => m.id) as [string, ...string[]]).optional(),
  voiceModel: z.enum(VOICE_MODELS.map((m) => m.id) as [string, ...string[]]).optional(),
});

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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  await userRepo.updateProfile(session.user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
