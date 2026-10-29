// src/components/translator/text-input-panel.tsx
// Source-text input area + char counter + clear + voice button + Auto/Append toggles.
//
// "Auto" toggle (default OFF): when ON, the parent translator auto-translates
// after a short debounce whenever the input changes (works for both text typing
// and voice input final results).
//
// "Append" toggle (default OFF): when ON AND in voice mode, each new voice
// result becomes its OWN separate box in a scrollable VoiceNotesList. The user
// can clear any single box without affecting the others. When OFF (or in text
// mode), voice input replaces the textarea content as before.
//
// Layout rules:
//   - Text mode (regardless of Append): single textarea, exactly as before.
//   - Voice mode + Append OFF: single textarea (voice fills it, replacing).
//   - Voice mode + Append ON: VoiceNotesList (scrollable, separate boxes) +
//     a small "add by typing" textarea at the bottom for manual edits.

'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Zap, Plus } from 'lucide-react';
import { VoiceInputButton } from '@/components/translator/voice-input-button';
import { VoiceNotesList, type VoiceNote } from '@/components/translator/voice-notes-list';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function TextInputPanel({
  value,
  onChange,
  maxLength,
  placeholder,
  voiceMode,
  voiceLang,
  voiceDisabled,
  autoTranslate,
  onAutoToggle,
  appendVoice,
  onAppendToggle,
  voiceNotes,
  onVoiceNotesChange,
  voiceModelId = 'web-speech',
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder?: string;
  voiceMode: boolean;
  voiceLang: string;
  voiceDisabled?: boolean;
  autoTranslate: boolean;
  onAutoToggle: (v: boolean) => void;
  appendVoice: boolean;
  onAppendToggle: (v: boolean) => void;
  voiceNotes: VoiceNote[];
  onVoiceNotesChange: (notes: VoiceNote[]) => void;
  voiceModelId?: string;
}) {
  // When Append is ON + voice mode, each voice result becomes a new note
  // in the voiceNotes array (separate box). When OFF or in text mode, voice
  // input writes directly to the textarea (replacing).
  const appendActive = appendVoice && voiceMode;

  function handleVoiceResult(transcript: string) {
    if (appendActive) {
      // Push a new separate note. The parent's onVoiceNotesChange handler
      // syncs the combined text to `input` for translation.
      const newNote: VoiceNote = {
        id: `vn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: transcript,
        createdAt: Date.now(),
      };
      onVoiceNotesChange([...voiceNotes, newNote]);
    } else {
      // Replace mode (default): voice fills the textarea directly.
      onChange(transcript);
    }
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* ── Main input area ─────────────────────────────────────────────────
          In Append+voice mode: show the scrollable VoiceNotesList.
          Otherwise: show the single textarea (text mode, or voice-replace mode). */}
      {appendActive ? (
        <div className="flex-1 flex flex-col min-h-0">
          <VoiceNotesList notes={voiceNotes} onChange={onVoiceNotesChange} />
        </div>
      ) : (
        <div className="relative flex-1">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={maxLength}
            placeholder={placeholder ?? 'Type or paste text to translate…'}
            dir="auto"
            className="min-h-32 h-full resize-none pr-2"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {voiceMode ? (
            <VoiceInputButton
              lang={voiceLang}
              onResult={handleVoiceResult}
              disabled={voiceDisabled}
              modelId={voiceModelId}
            />
          ) : null}
          {appendActive ? (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Each voice note gets its own box
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Auto-translate toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1">
                  <Zap
                    className={`h-3.5 w-3.5 transition-colors ${
                      autoTranslate ? 'text-amber-500 fill-amber-400/40' : 'text-muted-foreground'
                    }`}
                  />
                  <Switch
                    id="auto-translate"
                    checked={autoTranslate}
                    onCheckedChange={onAutoToggle}
                    aria-label="Toggle auto-translate"
                  />
                  <Label
                    htmlFor="auto-translate"
                    className="text-xs cursor-pointer select-none"
                  >
                    Auto
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {autoTranslate
                  ? 'Auto-translate is ON. New input will be translated automatically after a short delay.'
                  : 'Turn on to auto-translate as you type or speak (after a short delay).'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Append-voice toggle — only relevant in voice mode, but always
              visible so users can pre-set it before switching to voice. */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 ${
                    !voiceMode ? 'opacity-60' : ''
                  }`}
                >
                  <Plus
                    className={`h-3.5 w-3.5 transition-colors ${
                      appendVoice ? 'text-emerald-500' : 'text-muted-foreground'
                    }`}
                  />
                  <Switch
                    id="append-voice"
                    checked={appendVoice}
                    onCheckedChange={onAppendToggle}
                    aria-label="Toggle append voice input"
                  />
                  <Label
                    htmlFor="append-voice"
                    className="text-xs cursor-pointer select-none"
                  >
                    Append
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {appendVoice
                  ? 'Append is ON. Each new voice note gets its own separate box that you can clear individually.'
                  : 'Turn on to give each voice note its own box (clearable individually).'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {appendActive
                ? `${voiceNotes.length} note${voiceNotes.length === 1 ? '' : 's'}`
                : `${value.length} / ${maxLength}`}
            </span>
            {/* Clear-all button: in append mode clears all notes; otherwise clears the textarea */}
            {appendActive && voiceNotes.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onVoiceNotesChange([])}
                aria-label="Clear all voice notes"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : !appendActive && value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onChange('')}
                aria-label="Clear input"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
