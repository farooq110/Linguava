// src/components/translator/history-sidebar.tsx
// In-session translation history (not DB history — just current page session).
// Optional. Shown in a sidebar next to the translator.

'use client';

import { History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getLanguageFlag, getLanguageName } from '@/lib/languages';

export type SessionHistoryItem = {
  id: string;
  sourceLang: string;
  targetLang: string;
  inputText: string;
  outputText: string;
  createdAt: number;
};

export function HistorySidebar({ items, onPick }: { items: SessionHistoryItem[]; onPick?: (item: SessionHistoryItem) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">This session</span>
      </div>
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">Your translations in this session will appear here.</p>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                  onClick={() => onPick?.(it)}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <span aria-hidden>{getLanguageFlag(it.sourceLang)}</span>
                    <span>{getLanguageName(it.sourceLang)}</span>
                    <span>→</span>
                    <span aria-hidden>{getLanguageFlag(it.targetLang)}</span>
                    <span>{getLanguageName(it.targetLang)}</span>
                  </div>
                  <p className="text-sm line-clamp-2">{it.inputText}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{it.outputText}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
