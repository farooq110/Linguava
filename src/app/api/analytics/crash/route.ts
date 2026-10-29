// src/app/api/analytics/crash/route.ts
// POST client-side crash reports. Auth optional (anonymous crashes allowed).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getAuthOptions } from '@/lib/auth/config';
import { analyticsRepo } from '@/lib/repositories/analytics.repo';

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  url: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid crash report' }, { status: 400 });
  }
  let userId: string | undefined;
  try {
    const session = await getServerSession(getAuthOptions());
    userId = session?.user?.id;
  } catch {
    // ignore — anonymous crash report
  }
  await analyticsRepo.logCrash({ ...parsed.data, userId });
  return NextResponse.json({ ok: true });
}
