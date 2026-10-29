// src/components/translator/text-voice-toggle.tsx
// SegmentedControl-style toggle between text and voice input mode.

'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Keyboard, Mic } from 'lucide-react';

export function TextVoiceToggle({
  value,
  onChange,
  voiceDisabled,
  voiceDisabledReason,
}: {
  value: 'text' | 'voice';
  onChange: (v: 'text' | 'voice') => void;
  voiceDisabled?: boolean;
  voiceDisabledReason?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as 'text' | 'voice');
      }}
      className="rounded-md border bg-muted/40 p-0.5"
    >
      <ToggleGroupItem
        value="text"
        aria-label="Text input"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1.5"
        disabled={false}
      >
        <Keyboard className="h-3.5 w-3.5" />
        <span className="text-xs">Text</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="voice"
        aria-label="Voice input"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm gap-1.5"
        disabled={voiceDisabled}
        title={voiceDisabled ? voiceDisabledReason : undefined}
      >
        <Mic className="h-3.5 w-3.5" />
        <span className="text-xs">Voice</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
