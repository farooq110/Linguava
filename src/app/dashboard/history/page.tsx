// src/app/dashboard/history/page.tsx
// Server component that loads history. Client child handles filters & delete.

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { historyRepo } from '@/lib/repositories/history.repo';
import { getPlan } from '@/lib/subscription/plans';
import { Topbar } from '@/components/dashboard/topbar';
import { HistoryClient } from '@/components/dashboard/history-client';

export default async function HistoryPage() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/dashboard/history');
  }
  const plan = getPlan(session.user.plan ?? 'free');
  const items = await historyRepo.list({
    userId: session.user.id,
    days: plan.limits.historyDays,
    limit: 500,
  });
  return (
    <>
      <Topbar title="History" />
      <main className="flex-1 p-4 sm:p-6">
        <HistoryClient
          initialItems={items.map((i) => ({
            id: i.id,
            sourceLang: i.sourceLang,
            targetLang: i.targetLang,
            inputText: i.inputText,
            outputText: i.outputText,
            inputMode: i.inputMode,
            createdAt: i.createdAt.toISOString(),
          }))}
          retentionDays={plan.limits.historyDays}
        />
      </main>
    </>
  );
}
