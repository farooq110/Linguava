// src/components/translator/segment-list.tsx
// Per-sentence clear UI for the translator's Append mode.
//
// When the user has Append ON and has built up multiple spoken sentences,
// this component shows each sentence as a chip-style card with its own
// delete (X) button. Clicking X removes JUST that sentence from the input.
//
// The segments are derived from the current input value via splitSegments(),
// which preserves all whitespace and punctuation so that joining the
// remaining segments back together reproduces the exact original text minus
// the deleted sentence.
//
// This component is "controlled" by the parent — it receives the text and
// notifies the parent of the new text via onChange when a segment is deleted.
// It does NOT hold its own copy of the text; the textarea remains the single
// source of truth. We recompute segments on every render from the text prop,
// so manual edits in the textarea are reflected immediately here too.

'use client';

import { useMemo } from 'react';
import { X, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { splitSegments, joinSegments } from '@/lib/text/segments';

export function SegmentList({
  text,
  onChange,
}: {
  text: string;
  onChange: (newText: string) => void;
}) {
  // Recompute segments whenever the text changes. The segment IDs are
  // generated fresh each render (they're only used as React keys), which
  // is fine because we never need stable IDs across renders — we delete by
  // reference to the segment object in the current render's list.
  const segments = useMemo(() => splitSegments(text), [text]);

  // Filter to only segments that have visible text (skip pure-whitespace
  // artifacts that can arise from leading/trailing whitespace).
  const visibleSegments = segments.filter((s) => s.text.trim());

  if (visibleSegments.length === 0) return null;

  function removeSegment(segmentId: string) {
    // Reconstruct the text WITHOUT the deleted segment. joinSegments handles
    // preserving the separators of the remaining segments.
    const newText = joinSegments(segments, segmentId);
    onChange(newText);
  }

  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
        <MessageSquareText className="h-3.5 w-3.5" />
        <span>
          {visibleSegments.length} sentence{visibleSegments.length === 1 ? '' : 's'} —
          tap <X className="inline h-3 w-3" /> to remove any one
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
        {visibleSegments.map((seg, idx) => (
          <li
            key={seg.id}
            className="group flex items-start gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm"
          >
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5 shrink-0 tabular-nums">
              {idx + 1}.
            </span>
            <span className="flex-1 break-words leading-relaxed">{seg.text.trim()}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 opacity-60 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removeSegment(seg.id)}
              aria-label={`Remove sentence ${idx + 1}`}
              title="Remove this sentence"
            >
              <X className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
