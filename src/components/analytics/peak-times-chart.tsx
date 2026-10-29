// src/components/analytics/peak-times-chart.tsx
// Bar chart: translation counts by hour of day.

'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export function PeakTimesChart({ hourCounts, peakHour }: { hourCounts: number[]; peakHour: number }) {
  const data = hourCounts.map((count, hour) => ({
    hour: `${hour}:00`,
    count,
    isPeak: hour === peakHour,
  }));
  const peakLabel = `${((peakHour + 11) % 12) + 1}${peakHour < 12 ? ' AM' : ' PM'}`;
  const peakEnd = `${((peakHour + 12) % 12) + 1}${peakHour + 1 < 12 ? ' AM' : ' PM'}`;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Peak time: <span className="font-medium text-foreground">{peakLabel}–{peakEnd}</span>
      </p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} stroke="hsl(var(--muted-foreground))" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.isPeak ? '#f59e0b' : '#06b6d4'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
