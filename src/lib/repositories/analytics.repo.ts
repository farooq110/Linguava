// src/lib/repositories/analytics.repo.ts
// CrashReport + AnalyticsEvent persistence & queries.

import { db } from '@/lib/db';

export const analyticsRepo = {
  logCrash(input: {
    userId?: string;
    message: string;
    stack?: string;
    url?: string;
    userAgent?: string;
  }) {
    return db.crashReport.create({ data: input });
  },
  listCrashes(opts: { userId?: string; limit?: number }) {
    return db.crashReport.findMany({
      where: opts.userId ? { userId: opts.userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
    });
  },
  logEvent(input: { userId?: string; event: string; metadata?: string }) {
    return db.analyticsEvent.create({ data: input });
  },
  listEvents(opts: { userId?: string; limit?: number }) {
    return db.analyticsEvent.findMany({
      where: opts.userId ? { userId: opts.userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 100,
    });
  },
};
