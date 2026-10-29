// src/components/dashboard/history-client.tsx
// Filters, list, delete single + clear-all with confirm dialog.

'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Trash2, Inbox } from 'lucide-react';
import { LANGUAGES, getLanguageFlag, getLanguageName } from '@/lib/languages';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export type HistoryItem = {
  id: string;
  sourceLang: string;
  targetLang: string;
  inputText: string;
  outputText: string;
  inputMode: string;
  createdAt: string;
};

export function HistoryClient({
  initialItems,
  retentionDays,
}: {
  initialItems: HistoryItem[];
  retentionDays: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [fromFilter, setFromFilter] = useState<string>('all');
  const [toFilter, setToFilter] = useState<string>('all');

  async function remove(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      toast.error('Could not delete entry.');
    }
  }

  async function clearAll() {
    const prev = items;
    setItems([]);
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('History cleared.');
    } catch {
      setItems(prev);
      toast.error('Could not clear history.');
    }
  }

  const filtered = items.filter(
    (i) =>
      (fromFilter === 'all' || i.sourceLang === fromFilter) &&
      (toFilter === 'all' || i.targetLang === toFilter),
  );

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Retention notice</AlertTitle>
        <AlertDescription>
          Translations are kept for {retentionDays} days based on your plan, then automatically deleted. Free: 7 days, Diamond: 30 days, Premium: 90 days.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 flex-1 min-w-[140px] sm:flex-none sm:w-40">
          <label className="text-xs text-muted-foreground">From</label>
          <Select value={fromFilter} onValueChange={setFromFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[140px] sm:flex-none sm:w-40">
          <label className="text-xs text-muted-foreground">To</label>
          <Select value={toFilter} onValueChange={setToFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any</SelectItem>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto w-full sm:w-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={items.length === 0} className="w-full sm:w-auto">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all your saved translations. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No translations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {items.length === 0 ? 'Your translations will appear here.' : 'Try changing the filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((h) => (
            <li key={h.id} className="rounded-lg border bg-card p-3 group">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{getLanguageFlag(h.sourceLang)}</span>
                <span>{getLanguageName(h.sourceLang)}</span>
                <span>→</span>
                <span>{getLanguageFlag(h.targetLang)}</span>
                <span>{getLanguageName(h.targetLang)}</span>
                {h.inputMode === 'voice' ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">voice</span>
                ) : null}
                <span className="ml-auto">{formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => remove(h.id)}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-sm line-clamp-2">{h.inputText}</p>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{h.outputText}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
