// src/app/api/analytics/route.ts
// GET aggregated analytics for the current user (and app-wide if admin).
// Returns: totals, 30-day series, peak hours, recent events.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { usageRepo } from '@/lib/repositories/usage.repo';
import { analyticsRepo } from '@/lib/repositories/analytics.repo';

export async function GET() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const isAdmin = (session.user as any).role === 'admin';
  const userId = session.user.id;

  const totals = await usageRepo.totals(userId);
  const series = await usageRepo.lastDays(userId, 30);

  // Group by hour of day across the user's history (peak times chart).
  const history = await db.chatHistory.findMany({
    where: { userId },
    select: { createdAt: true },
    take: 1000,
    orderBy: { createdAt: 'desc' },
  });
  const hourCounts: number[] = new Array(24).fill(0);
  for (const h of history) {
    hourCounts[h.createdAt.getHours()]++;
  }

  const recentEvents = await analyticsRepo.listEvents({ userId, limit: 50 });
  const recentCrashes = await analyticsRepo.listCrashes({
    userId: isAdmin ? undefined : userId,
    limit: 25,
  });

  // Mock app-wide stats (admin only). In production these would come from
  // a real monitoring pipeline.
  const appWide = isAdmin
    ? {
        activeUsers: 1284,
        avgResponseMs: 412,
        uptimePct: 99.94,
      }
    : null;

  return NextResponse.json({
    totals: {
      translations: totals._sum.translations ?? 0,
      characters: totals._sum.characters ?? 0,
      voiceUses: totals._sum.voiceUses ?? 0,
    },
    today: {
      translations: series[series.length - 1]?.translations ?? 0,
    },
    series: series.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      translations: s.translations,
      characters: s.characters,
    })),
    hourCounts,
    peakHour: hourCounts.indexOf(Math.max(...hourCounts)),
    recentEvents,
    recentCrashes,
    appWide,
  });
}
