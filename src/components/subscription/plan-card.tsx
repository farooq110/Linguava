// src/components/subscription/plan-card.tsx
// Single plan card with features list + upgrade/current button.

'use client';

import { Check, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Plan } from '@/lib/subscription/plans';

const COLOR_MAP: Record<Plan['color'], string> = {
  slate: 'border-slate-200 dark:border-slate-800',
  cyan: 'border-cyan-300 dark:border-cyan-700 ring-1 ring-cyan-300/40',
  amber: 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-300/40',
};

const BUTTON_TEXT: Record<Plan['color'], string> = {
  slate: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200',
  cyan: 'bg-cyan-600 text-white hover:bg-cyan-500',
  amber: 'bg-amber-500 text-white hover:bg-amber-400',
};

export function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  upgrading,
}: {
  plan: Plan;
  isCurrent: boolean;
  onUpgrade?: () => void;
  upgrading?: boolean;
}) {
  return (
    <Card className={`relative ${COLOR_MAP[plan.color]} ${isCurrent ? 'shadow-md' : ''}`}>
      {plan.id === 'diamond' ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-cyan-600 text-white">Most popular</Badge>
        </div>
      ) : null}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          {plan.id === 'premium' ? <Crown className="h-5 w-5 text-amber-500" /> : null}
        </div>
        <p className="text-xs text-muted-foreground">{plan.description}</p>
        <div className="mt-2">
          <span className="text-3xl font-semibold">${plan.price.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground"> / month</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Current plan
          </Button>
        ) : (
          <Button
            className={`w-full ${BUTTON_TEXT[plan.color]}`}
            onClick={onUpgrade}
            disabled={upgrading}
          >
            {upgrading ? 'Upgrading…' : `Upgrade to ${plan.name}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
