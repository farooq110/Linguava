// src/components/translator/translation-output.tsx
// Output panel: translated text, copy button, Text/Speak toggle.
//
// - "Text" mode (default): just shows the translated text.
// - "Speak" mode: auto-speaks every new translation via the Web Speech API
//   (speechSynthesis), with the currently-spoken word highlighted in real time
//   using the SpeechSynthesisUtterance `onboundary` event.
//
// TTS is browser-native and free, so the toggle is available to all users.
// The previous plan-gated `ttsEnabled` prop is kept for backwards compat but
// no longer gates the UI — if you want to re-restrict TTS to Premium, set
// `ttsEnabled={false}` and the Speak option becomes disabled with a tooltip.

'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check, Loader2, Square, Volume2, Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { isRtl } from '@/lib/languages';
import { OutputModeToggle, type OutputMode } from '@/components/translator/output-mode-toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ActiveWord = { start: number; end: number } | null;

// Estimate the length of the word starting at `start` in `text`.
// Used as a fallback for browsers that don't expose `charLength` on the
// boundary event (e.g. Firefox). Walks forward until whitespace or end.
function guessWordLength(text: string, start: number): number {
  let i = start;
  while (i < text.length && !/\s/.test(text[i])) i++;
  return i - start;
}

export function TranslationOutput({
  text,
  loading,
  targetLang,
  ttsEnabled = true,
  onClear,
}: {
  text: string;
  loading: boolean;
  targetLang: string;
  ttsEnabled?: boolean;
  onClear?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [outputMode, setOutputMode] = useState<OutputMode>('text');
  const [speaking, setSpeaking] = useState(false);
  const [activeWord, setActiveWord] = useState<ActiveWord>(null);

  // Keep a ref to the latest text so the boundary callback always reads fresh
  // text (it captures `text` at speak-time, but the closure can be stale if
  // the user triggers another translation while one is still speaking).
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Track the last text we auto-spoke, so we don't re-speak the same text
  // when an unrelated re-render fires the effect.
  const lastSpokenRef = useRef<string>('');

  function speak(value: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in this browser.');
      return;
    }
    // Cancel anything already in flight so we don't get overlapping audio.
    window.speechSynthesis.cancel();
    setActiveWord(null);

    const utter = new SpeechSynthesisUtterance(value);
    utter.lang = targetLang;
    utter.rate = 0.95; // slightly slower for clarity when learning a language

    // Highlight the word being spoken. Chrome fires `word` boundaries; some
    // browsers also fire `sentence` boundaries — we only care about words.
    utter.onboundary = (event) => {
      if (event.name !== 'word') return;
      const start = event.charIndex ?? 0;
      const len = (event as any).charLength ?? guessWordLength(textRef.current, start);
      setActiveWord({ start, end: start + len });
    };

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => {
      setSpeaking(false);
      setActiveWord(null);
    };
    utter.onerror = () => {
      setSpeaking(false);
      setActiveWord(null);
      // Don't toast on 'interrupted' / 'canceled' — those happen when we
      // deliberately cancel() to start a new utterance.
    };

    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setActiveWord(null);
  }

  // Re-speak the current translation from the beginning. Useful when the user
  // wants to hear it again without re-running the translation. Also handy in
  // "Text" mode where auto-speak is off — this gives a manual way to speak.
  function speakAgain() {
    if (!text) return;
    speak(text);
  }

  // Clear the output. Stops any in-flight TTS first so audio doesn't keep
  // playing after the text is gone. Resets `lastSpokenRef` so that if the same
  // translation comes back later, it will be spoken again (in Speak mode).
  function clearOutput() {
    stopSpeaking();
    lastSpokenRef.current = '';
    onClear?.();
  }

  // Stop any in-flight TTS when the component unmounts.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Auto-speak whenever a new translation arrives AND output mode is "speak".
  // Skips speaking when text is empty or equal to the previously spoken text.
  // This synchronizes React state with the external `speechSynthesis` API,
  // which is exactly what effects are for — the setState calls happen inside
  // `speak` (mostly in async utter callbacks), not synchronously here.
  useEffect(() => {
    if (outputMode !== 'speak') return;
    if (!text || loading) return;
    if (text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    speak(text);
    // `speak` reads `targetLang` and `textRef` from closure; we deliberately
    // don't add them to the dep array so we don't re-speak on every keystroke.
  }, [text, outputMode, loading]);

  // Stop speaking immediately if the user switches back to "Text" mode.
  useEffect(() => {
    if (outputMode !== 'speak' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeaking(false);
      setActiveWord(null);
    }
  }, [outputMode]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }

  // Render the text with the active word highlighted. We split into 3 segments
  // (before / active / after) to preserve all original whitespace via
  // `whitespace-pre-wrap` on the parent <p>.
  function renderText() {
    if (!text) return null;
    if (!activeWord) {
      return <span>{text}</span>;
    }
    const before = text.slice(0, activeWord.start);
    const word = text.slice(activeWord.start, activeWord.end);
    const after = text.slice(activeWord.end);
    return (
      <>
        {before}
        <mark className="rounded bg-primary/25 px-0.5 text-primary-foreground underline decoration-primary decoration-2 underline-offset-2">
          {word}
        </mark>
        {after}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header row: Text/Speak toggle on the left, action buttons on the right.
          On very small screens the buttons wrap to a second row; on sm+ they
          stay on one line. Button labels are hidden below sm to save space. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OutputModeToggle
          value={outputMode}
          onChange={setOutputMode}
          disabled={!ttsEnabled}
          disabledReason="Upgrade to Premium for text-to-speech"
        />
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
          {outputMode === 'speak' && speaking ? (
            <Button type="button" variant="outline" size="sm" onClick={stopSpeaking}>
              <Square className="h-3.5 w-3.5 fill-current" />
              <span className="ml-1.5 sm:ml-2 text-xs">Stop</span>
            </Button>
          ) : null}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={speakAgain}
                  disabled={!text || speaking}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="ml-1.5 sm:ml-2 text-xs hidden sm:inline">Speak again</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Read the translation aloud</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!text}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="ml-1.5 sm:ml-2 text-xs hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          {onClear ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearOutput}
                    disabled={!text}
                    aria-label="Clear translation"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span className="ml-1.5 sm:ml-2 text-xs hidden sm:inline">Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear the translation</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>

      {/* Output text area */}
      <div
        className="flex-1 rounded-md border bg-muted/20 p-3 min-h-32 overflow-auto"
        dir={isRtl(targetLang) ? 'rtl' : 'ltr'}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Translating…
          </div>
        ) : text ? (
          <p className="text-base leading-relaxed whitespace-pre-wrap">{renderText()}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Translation will appear here.{' '}
            {outputMode === 'speak'
              ? 'New translations will be spoken automatically.'
              : ''}
          </p>
        )}
      </div>
    </div>
  );
}
