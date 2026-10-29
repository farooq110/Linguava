// src/lib/repositories/usage.repo.ts
// Wraps Usage queries (today, last-N-days, totals).

import { db } from '@/lib/db';

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const usageRepo = {
  today(userId: string) {
    return db.usage.findUnique({
      where: { userId_date: { userId, date: startOfTodayUTC() } },
    });
  },
  lastDays(userId: string, days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.usage.findMany({
      where: { userId, date: { gte: cutoff } },
      orderBy: { date: 'asc' },
    });
  },
  totals(userId: string) {
    return db.usage.aggregate({
      where: { userId },
      _sum: { translations: true, characters: true, voiceUses: true },
    });
  },
};
