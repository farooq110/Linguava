// src/lib/subscription/plans.ts
// Central definition of subscription tiers and their limits.
// To add a plan, add a new entry to PLANS below; pricing & UI read from here.

export type PlanId = 'free' | 'diamond' | 'premium';

export type PlanLimits = {
  dailyTranslations: number;
  maxCharsPerRequest: number;
  voiceInput: boolean;
  // '*' means all languages allowed, otherwise it's a list of language codes.
  allowedTargetLangs: string[] | '*';
  historyDays: number;
  ttsOutput: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  color: 'slate' | 'cyan' | 'amber';
  description: string;
  features: string[];
  limits: PlanLimits;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    color: 'slate',
    description: 'For casual translation needs.',
    features: [
      'Translate to English only',
      'Up to 100 translations / day',
      'Up to 500 characters per translation',
      'Text input only (no voice)',
      '7-day chat history',
      'Community support',
    ],
    limits: {
      dailyTranslations: 100,
      maxCharsPerRequest: 500,
      voiceInput: false,
      allowedTargetLangs: ['en'],
      historyDays: 7,
      ttsOutput: false,
    },
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    price: 9.99,
    color: 'cyan',
    description: 'For frequent translators and travelers.',
    features: [
      'Translate to ANY language',
      'Up to 1,000 translations / day',
      'Up to 2,000 characters per translation',
      'Voice input enabled',
      '30-day chat history',
      'Language auto-detection',
      'Email support',
    ],
    limits: {
      dailyTranslations: 1000,
      maxCharsPerRequest: 2000,
      voiceInput: true,
      allowedTargetLangs: '*',
      historyDays: 30,
      ttsOutput: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    color: 'amber',
    description: 'For professionals and power users.',
    features: [
      'Translate to ANY language',
      'Unlimited translations',
      'Up to 10,000 characters per translation',
      'Voice input + voice output (TTS)',
      '90-day chat history',
      'Priority translation model',
      'Custom translation glossary',
      'Priority support',
    ],
    limits: {
      dailyTranslations: Infinity,
      maxCharsPerRequest: 10000,
      voiceInput: true,
      allowedTargetLangs: '*',
      historyDays: 90,
      ttsOutput: true,
    },
  },
};

export const PLAN_LIST: Plan[] = [PLANS.free, PLANS.diamond, PLANS.premium];

export function getPlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.free;
}

export function isAllowedTargetLang(planId: string, langCode: string): boolean {
  const plan = getPlan(planId);
  if (plan.limits.allowedTargetLangs === '*') return true;
  return plan.limits.allowedTargetLangs.includes(langCode);
}
