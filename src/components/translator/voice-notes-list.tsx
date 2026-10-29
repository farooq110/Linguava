// src/components/translator/voice-notes-list.tsx
// Scrollable list of separate voice-note boxes — shown when Append mode is ON
// and the user is in voice input mode.
//
// Each voice note is its own card with:
//   - A number badge
//   - The transcript text (read-only)
//   - A delete (X) button that removes ONLY that note
//
// The list is scrollable (max-height fixed) so it never pushes other
// translator components around — it grows internally instead.
//
// The parent owns the notes array and passes it down with an onChange callback.
// Clearing one box calls onChange with the updated array (that one note removed).

'use client';

import { Mic, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export type VoiceNote = {
  id: string;
  text: string;
  createdAt: number;
};

export function VoiceNotesList({
  notes,
  onChange,
}: {
  notes: VoiceNote[];
  onChange: (notes: VoiceNote[]) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 px-4 rounded-md border border-dashed bg-muted/20 min-h-[120px]">
        <Mic className="h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Tap the mic and speak. Each voice note gets its own box here.
        </p>
      </div>
    );
  }

  function removeNote(id: string) {
    onChange(notes.filter((n) => n.id !== id));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="flex flex-col rounded-md border bg-muted/20 overflow-hidden">
      {/* Header row: count + clear-all */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40 shrink-0">
        <span className="text-xs text-muted-foreground">
          {notes.length} voice note{notes.length === 1 ? '' : 's'} —
          tap <X className="inline h-3 w-3" /> on any box to remove just that one
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={clearAll}
          aria-label="Clear all voice notes"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      </div>

      {/* Scrollable list of separate boxes — fixed max-height so the panel
          never grows tall enough to push other translator components. */}
      <ScrollArea className="max-h-[200px]" type="always">
        <ul className="flex flex-col gap-2 p-2.5">
          {notes.map((note, idx) => (
            <li
              key={note.id}
              className="group flex items-start gap-2.5 rounded-md border bg-background px-3 py-2.5 shadow-sm"
            >
              <span className="flex items-center justify-center h-5 w-5 shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold tabular-nums mt-0.5">
                {idx + 1}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <Mic className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="flex-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {note.text}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-50 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeNote(note.id)}
                aria-label={`Remove voice note ${idx + 1}`}
                title="Remove this voice note"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
