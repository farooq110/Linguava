// src/app/dashboard/subscription/page.tsx
// Three plan cards + usage meter. Upgrades call /api/subscription.

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Topbar } from '@/components/dashboard/topbar';
import { PlanCard } from '@/components/subscription/plan-card';
import { UsageMeter } from '@/components/subscription/usage-meter';
import { PLAN_LIST, type PlanId } from '@/lib/subscription/plans';

export default function SubscriptionPage() {
  const { data: session, update } = useSession();
  const [currentPlan, setCurrentPlan] = useState<PlanId>((session?.user?.plan as PlanId) ?? 'free');
  const [upgrading, setUpgrading] = useState<PlanId | null>(null);
  const [usage, setUsage] = useState<{
    translations: number;
    characters: number;
  }>({ translations: 0, characters: 0 });
  const [limits, setLimits] = useState<{
    dailyTranslations: number;
    maxCharsPerRequest: number;
  }>({ dailyTranslations: 100, maxCharsPerRequest: 500 });

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((d) => {
        setUsage(d.usage ?? { translations: 0, characters: 0 });
        setLimits({
          dailyTranslations: d.limits?.dailyTranslations ?? 100,
          maxCharsPerRequest: d.limits?.maxCharsPerRequest ?? 500,
        });
        if (d.plan) setCurrentPlan(d.plan);
      })
      .catch(() => {});
  }, []);

  async function upgrade(planId: PlanId) {
    setUpgrading(planId);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Upgrade failed.');
        return;
      }
      setCurrentPlan(planId);
      toast.success(`You're now on the ${data.plan} plan.`);
      // Refresh session JWT (so plan propagates to server components).
      await update?.();
    } finally {
      setUpgrading(null);
    }
  }

  return (
    <>
      <Topbar title="Subscription" />
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">Choose your plan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade or downgrade anytime. Demo mode — no real payment is processed.
          </p>
        </section>
        <UsageMeter
          translationsUsed={usage.translations}
          translationsLimit={limits.dailyTranslations}
          charsUsed={usage.characters}
          charsLimit={limits.maxCharsPerRequest}
        />
        <section className="grid gap-4 md:grid-cols-3">
          {PLAN_LIST.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              isCurrent={currentPlan === p.id}
              upgrading={upgrading === p.id}
              onUpgrade={() => upgrade(p.id)}
            />
          ))}
        </section>
      </main>
    </>
  );
}
