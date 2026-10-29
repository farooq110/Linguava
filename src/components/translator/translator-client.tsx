// src/components/translator/translator-client.tsx
// Main translator UI: source/target pickers, swap button, text/voice toggle,
// input panel, output panel. Talks to /api/translate and /api/detect-language.
//
// Modes:
//   - "auth" (default): full DB-backed translator. Reads plan limits from session.
//   - "demo": in-memory only; target locked to 5 langs. The per-session
//     translation cap is currently DISABLED — see "DEMO LIMIT (disabled)"
//     blocks below and docs/developer-guide.md to re-enable it.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ArrowLeftRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LanguagePicker } from '@/components/translator/language-picker';
import { TextInputPanel } from '@/components/translator/text-input-panel';
import { TranslationOutput } from '@/components/translator/translation-output';
import { TextVoiceToggle } from '@/components/translator/text-voice-toggle';
import { HistorySidebar, type SessionHistoryItem } from '@/components/translator/history-sidebar';
import { type VoiceNote } from '@/components/translator/voice-notes-list';
import {
  AUTO_DETECT_CODE,
  getLanguageName,
} from '@/lib/languages';
import { getPlan } from '@/lib/subscription/plans';

const DEMO_ALLOWED_LANGS = ['ur', 'en', 'es', 'fr', 'de', 'ja'];
// ── DEMO LIMIT (disabled) ────────────────────────────────────────────────
// To re-enable the per-session demo translation cap, uncomment this constant
// AND the `demoCount` state + the three checks marked "DEMO LIMIT" below
// AND the `remaining` useMemo AND the amber banner in the JSX.
// See docs/developer-guide.md → "Re-enabling the Demo Limit" for full steps.
// const DEMO_MAX_TRANSLATIONS = 5;
// ────────────────────────────────────────────────────────────────────────────

export function TranslatorClient({ mode, presetTarget }: { mode: 'auth' | 'demo'; presetTarget?: string }) {
  const { data: session } = useSession();
  const planId = (session?.user?.plan as string) ?? 'free';
  const plan = getPlan(planId);
  // Read user-configured defaults from the session (set in /dashboard/settings).
  // For authed users: source defaults to user's defaultSourceLang (Urdu by default),
  // target defaults to user's defaultTargetLang (English by default).
  // For demo users: source = Urdu, target = English.
  const userDefaultSource = (session?.user?.defaultSourceLang as string) ?? 'ur';
  const userDefaultTarget = (session?.user?.defaultTargetLang as string) ?? 'en';
  const userVoiceModel = (session?.user?.voiceModel as string) ?? 'web-speech';

  const [sourceLang, setSourceLang] = useState<string>(
    mode === 'auth' ? userDefaultSource : 'ur',
  );
  const [targetLang, setTargetLang] = useState<string>(
    presetTarget ?? (mode === 'auth' ? userDefaultTarget : 'en'),
  );
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [sessionItems, setSessionItems] = useState<SessionHistoryItem[]>([]);
  // ── DEMO LIMIT (disabled) ──────────────────────────────────────────────────
  // const [demoCount, setDemoCount] = useState(0);
  // ────────────────────────────────────────────────────────────────────────────
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [appendVoice, setAppendVoice] = useState(false);
  // When Append is ON + voice mode, each voice result becomes a separate
  // note in this array. The combined text (notes joined by space) is synced
  // to `input` so the translate logic still works unchanged. When Append is
  // OFF, this array is unused and voice input writes directly to `input`.
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  // Tracks the input value at the moment the last translation was kicked off.
  // Without this, the debounce effect would re-fire translate() on the very
  // input change that the previous translate() just produced (e.g. voice input
  // populating the textarea) and we'd loop.
  const lastTranslatedRef = useRef<string>('');

  // Apply preset target once.
  useEffect(() => {
    if (presetTarget) setTargetLang(presetTarget);
  }, [presetTarget]);

  // Force target to the plan's allowed language for free users (English by default).
  useEffect(() => {
    if (mode === 'auth' && plan.limits.allowedTargetLangs !== '*' && !plan.limits.allowedTargetLangs.includes(targetLang)) {
      setTargetLang(plan.limits.allowedTargetLangs[0] ?? 'en');
    }
  }, [plan, mode, targetLang]);

  const voiceDisabled = mode === 'auth' ? !plan.limits.voiceInput : false;
  const ttsEnabled = mode === 'auth' && plan.limits.ttsOutput;
  const maxChars = mode === 'demo' ? 500 : plan.limits.maxCharsPerRequest;

  const targetLocked = mode === 'auth' && plan.limits.allowedTargetLangs !== '*';
  const targetAllowedCodes = mode === 'demo' ? DEMO_ALLOWED_LANGS : undefined;

  function swap() {
    if (sourceLang === AUTO_DETECT_CODE) {
      toast.error("Can't swap when source is set to auto-detect.");
      return;
    }
    if (targetLocked) {
      toast.error('Upgrade to Diamond to translate to any language.');
      return;
    }
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInput(output);
    setOutput(input);
  }

  // ── Append-mode voice notes ──────────────────────────────────────────────
  // When Append is ON, each voice result is pushed as a separate note. The
  // notes array is the source of truth in that mode; the combined text
  // (notes joined by space) is synced to `input` so all the existing
  // translate/detect/auto-translate logic keeps working unchanged.
  function handleVoiceNotesChange(updated: VoiceNote[]) {
    setVoiceNotes(updated);
    setInput(updated.map((n) => n.text).filter(Boolean).join(' '));
    // Reset the last-translated guard so auto-translate fires for the new combined text.
    lastTranslatedRef.current = '';
  }

  // When the user turns Append OFF, clear the notes array (the textarea
  // already holds whatever single text was there).
  function handleAppendToggle(next: boolean) {
    setAppendVoice(next);
    if (!next) {
      setVoiceNotes([]);
    }
  }

  async function detectAndValidate(): Promise<boolean> {
    if (sourceLang === AUTO_DETECT_CODE) return true;
    // Skip detection for very short inputs (likely noise).
    if (input.trim().length < 3) return true;
    try {
      const res = await fetch('/api/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) return true; // don't block on detection failure
      const data = await res.json();
      const detected = (data.language ?? '').toLowerCase();
      const selected = sourceLang.toLowerCase();
      if (detected && detected !== selected) {
        toast.error(
          `Hmm, that doesn't look like ${getLanguageName(selected)}. Detected ${getLanguageName(
            detected,
          )}. Please switch your source language or rewrite your text.`,
        );
        return false;
      }
    } catch {
      // ignore
    }
    return true;
  }

  const translate = useCallback(async (opts?: { skipAutoGuard?: boolean }) => {
    if (!input.trim()) return;
    // When triggered by the auto-debounce, skip if the input hasn't changed
    // since the last translation (prevents double-fire on rapid edits).
    if (!opts?.skipAutoGuard && input === lastTranslatedRef.current) return;
    lastTranslatedRef.current = input;
    // ── DEMO LIMIT (disabled) ────────────────────────────────────────────────
    // if (mode === 'demo' && demoCount >= DEMO_MAX_TRANSLATIONS) {
    //   toast.error('Demo limit reached. Sign up free to continue.');
    //   return;
    // }
    // ──────────────────────────────────────────────────────────────────────────
    setLoading(true);
    setOutput('');
    try {
      if (mode === 'auth' && !(await detectAndValidate())) {
        setLoading(false);
        return;
      }

      const endpoint = mode === 'auth' ? '/api/translate' : '/api/demo-translate';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: input,
          from: sourceLang,
          to: targetLang,
          mode: inputMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // ── DEMO LIMIT (disabled) ─────────────────────────────────────────────
        // if (data.code === 'demo_limit_reached') {
        //   toast.error(data.error);
        //   setDemoCount(DEMO_MAX_TRANSLATIONS);
        //   return;
        // }
        // ────────────────────────────────────────────────────────────────────────
        toast.error(data.error ?? 'Translation failed.');
        return;
      }
      setOutput(data.translation);
      if (data.detected && sourceLang === AUTO_DETECT_CODE) {
        // Optionally surface detected language via toast (non-blocking).
      }
      const item: SessionHistoryItem = {
        id: crypto.randomUUID(),
        sourceLang: data.detected ?? sourceLang,
        targetLang,
        inputText: input,
        outputText: data.translation,
        createdAt: Date.now(),
      };
      setSessionItems((prev) => [item, ...prev].slice(0, 50));
      // ── DEMO LIMIT (disabled) ──────────────────────────────────────────────
      // if (mode === 'demo') setDemoCount((c) => c + 1);
      // ────────────────────────────────────────────────────────────────────────
    } catch (err: any) {
      toast.error(err?.message ?? 'Network error.');
    } finally {
      setLoading(false);
    }
  }, [input, mode, sourceLang, targetLang, inputMode]);

  // ── DEMO LIMIT (disabled) ────────────────────────────────────────────────
  // const remaining = useMemo(() => {
  //   if (mode === 'demo') return Math.max(0, DEMO_MAX_TRANSLATIONS - demoCount);
  //   return null;
  // }, [mode, demoCount]);
  // ────────────────────────────────────────────────────────────────────────────

  // Auto-translate debounce.
  // When `autoTranslate` is ON and the input changes (either from typing or
  // from a voice-input final result), wait AUTO_DELAY_MS of silence then
  // trigger translate(). The delay gives the user time to finish a sentence
  // before we burn a translation request.
  //
  // Voice input gets a shorter delay because by the time onResult fires with
  // isFinal=true, the user has already paused speaking.
  const AUTO_DELAY_TEXT_MS = 900;
  const AUTO_DELAY_VOICE_MS = 500;
  useEffect(() => {
    if (!autoTranslate) return;
    if (!input.trim()) return;
    if (input === lastTranslatedRef.current) return;
    if (loading) return;
    const delay = inputMode === 'voice' ? AUTO_DELAY_VOICE_MS : AUTO_DELAY_TEXT_MS;
    const t = setTimeout(() => {
      translate({ skipAutoGuard: true });
    }, delay);
    return () => clearTimeout(t);
  }, [input, autoTranslate, inputMode, loading]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        {mode === 'demo' ? (
          <div className="rounded-md border bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100">
            You&apos;re using the demo. Sign up free to unlock more.
            {/* ── DEMO LIMIT (disabled) ── */}
            {/* {remaining} translation{remaining === 1 ? '' : 's'} left. */}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[140px] sm:min-w-[160px]">
            <LanguagePicker
              value={sourceLang}
              onChange={setSourceLang}
              allowAuto={mode === 'auth' ? planId !== 'free' : true}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline" size="icon" onClick={swap} aria-label="Swap languages" className="shrink-0">
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Swap source and target</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex-1 min-w-[140px] sm:min-w-[160px]">
            <LanguagePicker
              value={targetLang}
              onChange={setTargetLang}
              locked={targetLocked}
              lockedReason="Upgrade to Diamond to translate to any language"
              allowedCodes={targetAllowedCodes}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <TextVoiceToggle
            value={inputMode}
            onChange={setInputMode}
            voiceDisabled={voiceDisabled}
            voiceDisabledReason="Voice input requires Diamond or Premium"
          />
          <Button type="button" onClick={() => translate({ skipAutoGuard: true })} disabled={loading || !input.trim()} className="gap-2 w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Translate
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-3 min-h-[260px]">
            <TextInputPanel
              value={input}
              onChange={setInput}
              maxLength={maxChars}
              voiceMode={inputMode === 'voice'}
              voiceLang={sourceLang === AUTO_DETECT_CODE ? 'ur-PK' : sourceLang}
              voiceDisabled={voiceDisabled}
              autoTranslate={autoTranslate}
              onAutoToggle={setAutoTranslate}
              appendVoice={appendVoice}
              onAppendToggle={handleAppendToggle}
              voiceNotes={voiceNotes}
              onVoiceNotesChange={handleVoiceNotesChange}
              voiceModelId={mode === 'auth' ? userVoiceModel : 'web-speech'}
            />
          </div>
          <div className="rounded-xl border bg-card p-3 min-h-[260px]">
            <TranslationOutput
              text={output}
              loading={loading}
              targetLang={targetLang}
              // Browser-native speechSynthesis is free for everyone; the
              // previous plan-gated `ttsEnabled` is now always true.
              ttsEnabled
              onClear={() => {
                setOutput('');
                // Reset the last-translated guard so re-running the same
                // translation after clearing will actually translate again
                // (otherwise the auto-translate effect would no-op).
                lastTranslatedRef.current = '';
              }}
            />
          </div>
        </div>
      </div>

      <aside className="hidden lg:block rounded-xl border bg-card overflow-hidden min-h-[260px]">
        <HistorySidebar items={sessionItems} onPick={(it) => setInput(it.inputText)} />
      </aside>
    </div>
  );
}
