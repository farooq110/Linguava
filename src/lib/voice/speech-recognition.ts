// src/lib/voice/speech-recognition.ts
// Default VoiceProvider using the browser's Web Speech API.
//
// To swap to Azure Speech SDK / OpenAI Whisper / Deepgram:
//   1. Implement the `VoiceProvider` interface from `./types` against your SDK.
//   2. Change `getVoiceProvider()` below to return your new impl.
// The UI components only depend on the interface, so no UI changes are needed.

import type { VoiceProvider, VoiceError } from '@/lib/voice/types';

// Minimal typing for the unprefixed/prefixed Web Speech API globals.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function getCtor(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class WebSpeechProvider implements VoiceProvider {
  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;
  private resultCbs: Set<(text: string, isFinal: boolean) => void> = new Set();
  private errorCbs: Set<(err: VoiceError) => void> = new Set();
  private stateCbs: Set<(listening: boolean) => void> = new Set();

  isSupported(): boolean {
    return getCtor() !== null;
  }

  isListening(): boolean {
    return this.listening;
  }

  start(lang: string): void {
    const Ctor = getCtor();
    if (!Ctor) {
      this.emitError({ code: 'not-supported', message: 'Speech recognition is not supported in this browser.' });
      return;
    }
    if (this.listening) return;
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.listening = true;
      this.emitState(true);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) this.emitResult(final, true);
      else if (interim) this.emitResult(interim, false);
    };

    recognition.onerror = (event: any) => {
      const code = this.mapError(event?.error ?? 'unknown');
      this.emitError({ code, message: this.errorMessage(code) });
    };

    recognition.onend = () => {
      this.listening = false;
      this.emitState(false);
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.emitError({ code: 'unknown', message: 'Could not start voice recognition.' });
    }
  }

  stop(): void {
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
    this.listening = false;
    this.emitState(false);
  }

  onResult(cb: (text: string, isFinal: boolean) => void): () => void {
    this.resultCbs.add(cb);
    return () => this.resultCbs.delete(cb);
  }
  onError(cb: (err: VoiceError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
  onStateChange(cb: (listening: boolean) => void): () => void {
    this.stateCbs.add(cb);
    return () => this.stateCbs.delete(cb);
  }

  private emitResult(text: string, isFinal: boolean) {
    this.resultCbs.forEach((cb) => cb(text, isFinal));
  }
  private emitError(err: VoiceError) {
    this.errorCbs.forEach((cb) => cb(err));
  }
  private emitState(listening: boolean) {
    this.stateCbs.forEach((cb) => cb(listening));
  }

  private mapError(raw: string): VoiceError['code'] {
    switch (raw) {
      case 'no-speech':
        return 'no-speech';
      case 'audio-capture':
        return 'audio-capture';
      case 'not-allowed':
      case 'service-not-allowed':
        return 'not-allowed';
      case 'network':
        return 'network';
      default:
        return 'unknown';
    }
  }
  private errorMessage(code: VoiceError['code']): string {
    switch (code) {
      case 'not-supported':
        return 'Speech recognition is not supported in this browser.';
      case 'no-speech':
        return 'No speech detected. Please try again.';
      case 'audio-capture':
        return 'No microphone found. Check your device.';
      case 'not-allowed':
        return 'Microphone permission denied. Enable it in your browser settings.';
      case 'network':
        return 'Network error during speech recognition.';
      default:
        return 'Voice input failed. Please try again.';
    }
  }
}

let _provider: VoiceProvider | null = null;
export function getVoiceProvider(): VoiceProvider {
  if (!_provider) _provider = new WebSpeechProvider();
  return _provider;
}
