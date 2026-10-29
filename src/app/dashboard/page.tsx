// src/app/dashboard/page.tsx
// Overview: greeting + quick stats + chat history preview.

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { Topbar } from '@/components/dashboard/topbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Languages, History, Sparkles, ArrowRight } from 'lucide-react';
import { historyRepo } from '@/lib/repositories/history.repo';
import { getPlan } from '@/lib/subscription/plans';
import { getTodayUsage } from '@/lib/subscription/guard';
import { formatDistanceToNow } from 'date-fns';
import { getLanguageFlag, getLanguageName } from '@/lib/languages';

export default async function DashboardHome() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/dashboard');
  }
  const plan = getPlan(session.user.plan ?? 'free');
  const userId = session.user.id;

  const [today, recent] = await Promise.all([
    getTodayUsage(userId),
    historyRepo.list({ userId, days: plan.limits.historyDays, limit: 5 }),
  ]);

  return (
    <>
      <Topbar title="Overview" />
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">
            Welcome back, {session?.user?.name ?? session?.user?.email?.split('@')[0]}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;re on the <span className="font-medium text-foreground">{plan.name}</span> plan. {plan.limits.dailyTranslations === Infinity ? 'Unlimited translations today.' : `${plan.limits.dailyTranslations - today.translations} translations left today.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/translate">
                <Sparkles className="h-4 w-4 mr-2" />
                Start translating
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/history">
                <History className="h-4 w-4 mr-2" />
                View history
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s translations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{today.translations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {plan.limits.dailyTranslations === Infinity ? 'No daily limit' : `of ${plan.limits.dailyTranslations} allowed`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Characters today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{today.characters.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold capitalize">{plan.name}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/dashboard/subscription" className="text-primary hover:underline inline-flex items-center">
                  Manage plan <ArrowRight className="h-3 w-3 ml-0.5" />
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Recent translations</h3>
            <Link href="/dashboard/history" className="text-sm text-primary hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center text-center py-10">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <Languages className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No translations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start your first translation to see it here.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/translate">Translate something</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {recent.map((h) => (
                <li key={h.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>{getLanguageFlag(h.sourceLang)}</span>
                    <span>{getLanguageName(h.sourceLang)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{getLanguageFlag(h.targetLang)}</span>
                    <span>{getLanguageName(h.targetLang)}</span>
                    <span className="ml-auto">{formatDistanceToNow(h.createdAt, { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm line-clamp-1">{h.inputText}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{h.outputText}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
