// src/lib/text/segments.ts
// Split a passage into segments (sentences / lines) for the per-segment
// clear UI in the translator's Append mode.
//
// Requirements:
//   - Split on newlines AND on sentence-ending punctuation (. ! ? 。 ！ ？)
//     when followed by whitespace or end-of-string.
//   - PRESERVE the original text exactly when segments are joined back.
//     This means we track each segment's trailing separator (whitespace +
//     punctuation) so that removing a segment and rejoining the rest yields
//     the same string the user would see if they'd never typed that segment.
//
// The split is intentionally simple — it's for a UX affordance (letting the
// user delete one spoken sentence at a time), not for NLP-accurate sentence
// boundary detection. Abbreviations like "Dr." will split, but that's fine
// because the user sees the chips and can verify before deleting.

export type Segment = {
  /** The visible text of the segment, trimmed of leading/trailing whitespace. */
  text: string;
  /** The original separator that followed this segment (newline, ". ", "! ", etc.). */
  sep: string;
  /** Stable key for React lists. */
  id: string;
};

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `seg-${_idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// Matches a sentence-ending punctuation char optionally followed by
// whitespace, OR a run of whitespace+newline. Used with split+capture to
// keep the separators.
// We capture the separator so split() returns [text, sep, text, sep, ...].
const SEPARATOR_RE = /([.!?。！？]+\s*|\n+)/;

/**
 * Split `text` into segments. Each segment is a { text, sep, id } triple.
 * Joining all segments as `text + sep` reconstructs the original string
 * exactly (use `joinSegments`).
 */
export function splitSegments(text: string): Segment[] {
  if (!text) return [];

  // If the text has no sentence boundaries at all, return a single segment.
  if (!SEPARATOR_RE.test(text)) {
    return [{ text, sep: '', id: nextId() }];
  }

  // Reset regex state (defensive — our regex has no `g` flag so lastIndex
  // shouldn't be set, but just in case).
  SEPARATOR_RE.lastIndex = 0;

  const parts = text.split(SEPARATOR_RE);
  const segments: Segment[] = [];

  // split() with a capture group returns alternating [text, sep, text, sep, ...].
  // The last element may be a text with no trailing sep (i.e., '').
  for (let i = 0; i < parts.length; i += 2) {
    const segText = parts[i] ?? '';
    const sep = parts[i + 1] ?? '';
    // Skip fully-empty segment+sep pairs.
    if (segText === '' && sep === '') continue;
    // If the segment is purely whitespace (rare, but can happen with multiple
    // newlines), fold it into the separator of the previous segment.
    if (segText !== '' && segText.trim() === '' && segments.length > 0) {
      segments[segments.length - 1].sep += segText + sep;
      continue;
    }
    segments.push({ text: segText, sep, id: nextId() });
  }

  // Clean up any leading/trailing empty segment that arose from edge cases.
  return segments.filter((s) => s.text !== '' || s.sep !== '');
}

/**
 * Join segments back into a single string. Inverse of splitSegments.
 * If `excludeId` is provided, that segment is omitted from the result.
 */
export function joinSegments(segments: Segment[], excludeId?: string): string {
  return segments
    .filter((s) => s.id !== excludeId)
    .map((s) => s.text + s.sep)
    .join('');
}

/**
 * Count how many non-empty segments a text would split into.
 * Useful for showing "3 sentences" in the UI.
 */
export function countSegments(text: string): number {
  if (!text.trim()) return 0;
  return splitSegments(text).filter((s) => s.text.trim()).length;
}
