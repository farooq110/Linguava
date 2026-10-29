// src/lib/subscription/guard.ts
// Enforces plan limits before a translation is allowed.
// Used by /api/translate. Repository methods are called for usage stats.

import { db } from '@/lib/db';
import { getPlan } from '@/lib/subscription/plans';

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: string; code: string };

export async function getUserPlan(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan ?? 'free';
}

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getTodayUsage(userId: string) {
  const start = startOfTodayUTC();
  const usage = await db.usage.findUnique({
    where: {
      userId_date: { userId, date: start },
    },
  });
  return {
    translations: usage?.translations ?? 0,
    characters: usage?.characters ?? 0,
    voiceUses: usage?.voiceUses ?? 0,
  };
}

export async function checkTranslationAllowed(opts: {
  userId: string;
  targetLang: string;
  inputMode: string;
  textLength: number;
}): Promise<GuardResult> {
  const planId = await getUserPlan(opts.userId);
  const plan = getPlan(planId);
  const limits = plan.limits;

  // Target language restriction.
  if (limits.allowedTargetLangs !== '*') {
    if (!limits.allowedTargetLangs.includes(opts.targetLang)) {
      return {
        ok: false,
        code: 'lang_restricted',
        reason: `Your ${plan.name} plan only allows translating to ${limits.allowedTargetLangs
          .map((l) => l.toUpperCase())
          .join(', ')}. Upgrade to unlock all languages.`,
      };
    }
  }

  // Voice input restriction.
  if (opts.inputMode === 'voice' && !limits.voiceInput) {
    return {
      ok: false,
      code: 'voice_locked',
      reason: `Voice input is not available on the ${plan.name} plan. Upgrade to Diamond or Premium.`,
    };
  }

  // Character count restriction.
  if (opts.textLength > limits.maxCharsPerRequest) {
    return {
      ok: false,
      code: 'too_many_chars',
      reason: `Your input has ${opts.textLength} characters. The ${plan.name} plan allows up to ${limits.maxCharsPerRequest} characters per request.`,
    };
  }

  // Daily translation count restriction.
  if (limits.dailyTranslations !== Infinity) {
    const usage = await getTodayUsage(opts.userId);
    if (usage.translations >= limits.dailyTranslations) {
      return {
        ok: false,
        code: 'daily_limit_reached',
        reason: `You've used all ${limits.dailyTranslations} daily translations on the ${plan.name} plan. Upgrade for more.`,
      };
    }
  }

  return { ok: true };
}

export async function incrementUsage(
  userId: string,
  delta: { translations?: number; characters?: number; voiceUses?: number },
) {
  const start = startOfTodayUTC();
  const existing = await db.usage.findUnique({
    where: { userId_date: { userId, date: start } },
  });
  if (existing) {
    await db.usage.update({
      where: { id: existing.id },
      data: {
        translations: existing.translations + (delta.translations ?? 0),
        characters: existing.characters + (delta.characters ?? 0),
        voiceUses: existing.voiceUses + (delta.voiceUses ?? 0),
      },
    });
  } else {
    await db.usage.create({
      data: {
        userId,
        date: start,
        translations: delta.translations ?? 0,
        characters: delta.characters ?? 0,
        voiceUses: delta.voiceUses ?? 0,
      },
    });
  }
}
