// src/components/translator/voice-input-button.tsx
// Mic button. Uses the VoiceProvider adapter from @/lib/voice.
// Pulses while listening; emits final transcript via onResult.
//
// The `modelId` prop selects which STT engine to use (web-speech,
// huggingface, vosk). Defaults to 'web-speech'.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getVoiceProvider } from '@/lib/voice';

export function VoiceInputButton({
  lang,
  onResult,
  disabled,
  modelId = 'web-speech',
}: {
  lang: string;
  onResult: (text: string) => void;
  disabled?: boolean;
  modelId?: string;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const providerRef = useRef(getVoiceProvider(modelId));

  useEffect(() => {
    // Re-create the provider when the model changes.
    providerRef.current = getVoiceProvider(modelId);
    const p = providerRef.current;
    setSupported(p.isSupported());
    const offState = p.onStateChange((l) => setListening(l));
    const offErr = p.onError((err) => {
      toast.error(err.message);
    });
    const offResult = p.onResult((text, isFinal) => {
      if (isFinal) onResult(text);
    });
    return () => {
      offState();
      offErr();
      offResult();
    };
  }, [onResult, modelId]);

  async function toggle() {
    const p = providerRef.current;
    if (!p.isSupported()) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (listening) {
      p.stop();
    } else {
      // HuggingFace and Vosk providers have async start()
      await p.start(lang);
    }
  }

  if (!supported) {
    return (
      <Button type="button" variant="outline" size="sm" disabled title="Not supported in this browser">
        <MicOff className="h-4 w-4" />
        <span className="ml-2 text-xs">Not supported</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      className={listening ? 'relative' : ''}
    >
      {listening ? (
        <>
          <span className="absolute inset-0 rounded-md animate-ping bg-primary/40" aria-hidden />
          <Mic className="h-4 w-4 relative" />
          <span className="ml-2 text-xs relative">Listening…</span>
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          <span className="ml-2 text-xs">Speak</span>
        </>
      )}
    </Button>
  );
}
