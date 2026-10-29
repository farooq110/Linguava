// src/app/dashboard/analytics/page.tsx
// Analytics dashboard for the logged-in user (and admin sees app-wide mocks).

import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { usageRepo } from '@/lib/repositories/usage.repo';
import { analyticsRepo } from '@/lib/repositories/analytics.repo';
import { Topbar } from '@/components/dashboard/topbar';
import { StatCard } from '@/components/analytics/stat-card';
import { UsageChart } from '@/components/analytics/usage-chart';
import { PeakTimesChart } from '@/components/analytics/peak-times-chart';
import { CrashLogTable } from '@/components/analytics/crash-log-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Languages, CalendarDays, Activity, Zap, CheckCircle2 } from 'lucide-react';

export default async function AnalyticsPage() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/dashboard/analytics');
  }
  const userId = session.user.id;
  const isAdmin = (session.user as any).role === 'admin';

  const [totals, series, history, crashes] = await Promise.all([
    usageRepo.totals(userId),
    usageRepo.lastDays(userId, 30),
    db.chatHistory.findMany({
      where: { userId },
      select: { createdAt: true },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    }),
    analyticsRepo.listCrashes({ userId: isAdmin ? undefined : userId, limit: 25 }),
  ]);

  const hourCounts: number[] = new Array(24).fill(0);
  for (const h of history) hourCounts[h.createdAt.getHours()]++;
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const today = series[series.length - 1]?.translations ?? 0;
  const appWide = isAdmin
    ? { activeUsers: 1284, avgResponseMs: 412, uptimePct: 99.94 }
    : null;

  return (
    <>
      <Topbar title="Analytics" />
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <section className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Operational
          </Badge>
          {appWide ? (
            <span className="text-xs text-muted-foreground">
              {appWide.uptimePct}% uptime (last 30 days)
            </span>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total translations"
            value={(totals._sum.translations ?? 0).toLocaleString()}
            hint="All time"
            icon={Languages}
          />
          <StatCard
            label="Today"
            value={today}
            icon={CalendarDays}
          />
          <StatCard
            label="Active users"
            value={appWide ? appWide.activeUsers.toLocaleString() : '—'}
            hint={appWide ? 'App-wide (admin)' : 'Admin only'}
            icon={Activity}
          />
          <StatCard
            label="Avg response time"
            value={appWide ? `${appWide.avgResponseMs} ms` : '—'}
            hint={appWide ? 'App-wide (admin)' : 'Admin only'}
            icon={Zap}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Translations — last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageChart data={series.map((s) => ({ date: s.date.toISOString().slice(5, 10), translations: s.translations }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peak hours</CardTitle>
            </CardHeader>
            <CardContent>
              <PeakTimesChart hourCounts={hourCounts} peakHour={peakHour} />
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">Recent crashes</h2>
          <CrashLogTable
            rows={crashes.map((c) => ({
              id: c.id,
              message: c.message,
              stack: c.stack,
              url: c.url,
              userAgent: c.userAgent,
              createdAt: c.createdAt.toISOString(),
            }))}
          />
        </section>
      </main>
    </>
  );
}
