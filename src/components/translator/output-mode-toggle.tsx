// src/components/translator/output-mode-toggle.tsx
// SegmentedControl-style toggle for the OUTPUT panel:
//   - "Text"  → just show the translated text (default)
//   - "Speak" → auto-speak every new translation via TTS, with word highlight
//
// Mirrors the look of TextVoiceToggle so the input and output toggles match.

'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Type, Volume2 } from 'lucide-react';

export type OutputMode = 'text' | 'speak';

export function OutputModeToggle({
  value,
  onChange,
  disabled,
  disabledReason,
}: {
  value: OutputMode;
  onChange: (v: OutputMode) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as OutputMode);
      }}
      className="rounded-md border bg-muted/40 p-0.5"
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
    >
      <ToggleGroupItem
        value="text"
        aria-label="Show text only"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1.5"
      >
        <Type className="h-3.5 w-3.5" />
        <span className="text-xs">Text</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="speak"
        aria-label="Speak the translation"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1.5"
        disabled={disabled}
      >
        <Volume2 className="h-3.5 w-3.5" />
        <span className="text-xs">Speak</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
