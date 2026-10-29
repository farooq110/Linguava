// src/app/api/history/route.ts
// GET list (filtered by 7/30/90-day retention based on user plan).
// DELETE clear-all for current user.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { historyRepo } from '@/lib/repositories/history.repo';
import { getPlan } from '@/lib/subscription/plans';

export async function GET(req: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const url = new URL(req.url);
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;
  const plan = getPlan(session.user.plan ?? 'free');
  const items = await historyRepo.list({
    userId: session.user.id,
    days: plan.limits.historyDays,
    limit: 500,
    from,
    to,
  });
  return NextResponse.json({ items, retentionDays: plan.limits.historyDays });
}

export async function DELETE() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  await historyRepo.clearAll(session.user.id);
  return NextResponse.json({ ok: true });
}
