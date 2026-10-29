// src/components/translator/translator-preset.tsx
// Thin wrapper around TranslatorClient that pre-sets the target language.
// Used by /dashboard/translate/[targetLang] route.

'use client';

import { useSession } from 'next-auth/react';
import { TranslatorClient } from '@/components/translator/translator-client';
import { getPlan } from '@/lib/subscription/plans';

export function TranslatorClientWithPreset({ targetLang }: { targetLang: string }) {
  const { data: session } = useSession();
  const planId = (session?.user?.plan as string) ?? 'free';
  const plan = getPlan(planId);
  const allowed =
    plan.limits.allowedTargetLangs === '*' || plan.limits.allowedTargetLangs.includes(targetLang);
  // If the language isn't allowed for this plan, render the standard client
  // which locks to the plan's allowed language (Urdu for free); user will
  // see the locked dropdown + tooltip.
  return <TranslatorClient mode="auth" presetTarget={allowed ? targetLang : undefined} />;
}
