// src/app/api/usage/route.ts
// GET today's usage + plan limits (for the usage meter on the subscription page).

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { getTodayUsage, getUserPlan } from '@/lib/subscription/guard';
import { getPlan } from '@/lib/subscription/plans';

export async function GET() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const planId = await getUserPlan(session.user.id);
  const plan = getPlan(planId);
  const usage = await getTodayUsage(session.user.id);
  return NextResponse.json({
    plan: planId,
    usage,
    limits: plan.limits,
  });
}
