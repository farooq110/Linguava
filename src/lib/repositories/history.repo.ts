// src/lib/repositories/history.repo.ts
// ChatHistory CRUD with 7/30/90-day retention enforced at read time.

import { db } from '@/lib/db';
import { getPlan } from '@/lib/subscription/plans';

export const historyRepo = {
  list(opts: { userId: string; days?: number; limit?: number; from?: string; to?: string }) {
    const days = opts.days ?? getPlan('free').limits.historyDays;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where: any = {
      userId: opts.userId,
      createdAt: { gte: cutoff },
    };
    if (opts.from) where.sourceLang = opts.from;
    if (opts.to) where.targetLang = opts.to;
    return db.chatHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 200,
    });
  },
  create(input: {
    userId: string;
    sourceLang: string;
    targetLang: string;
    inputText: string;
    outputText: string;
    inputMode: string;
  }) {
    return db.chatHistory.create({ data: input });
  },
  delete(id: string, userId: string) {
    return db.chatHistory.deleteMany({ where: { id, userId } });
  },
  clearAll(userId: string) {
    return db.chatHistory.deleteMany({ where: { userId } });
  },
  /** Hard-delete rows older than N days. Call from a cron/admin endpoint. */
  pruneOld(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.chatHistory.deleteMany({ where: { createdAt: { lt: cutoff } } });
  },
};
