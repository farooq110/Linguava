// src/components/analytics/crash-log-table.tsx
// Recent CrashReports table.

import { formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';

export type CrashRow = {
  id: string;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  createdAt: string;
};

export function CrashLogTable({ rows }: { rows: CrashRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-8 text-sm text-muted-foreground">
        <AlertTriangle className="h-6 w-6 mb-2" />
        No crashes reported. All systems nominal.
      </div>
    );
  }
  return (
    <ScrollArea className="max-h-96 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Message</TableHead>
            <TableHead className="w-1/3">Stack / URL</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="align-top text-xs font-mono">{r.message.slice(0, 120)}</TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {r.stack ? <div className="line-clamp-3 font-mono">{r.stack}</div> : null}
                {r.url ? <div className="truncate mt-1">{r.url}</div> : null}
              </TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
