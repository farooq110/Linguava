// src/lib/voice/vosk-provider.ts
// VoiceProvider implementation using vosk-browser (WebAssembly).
//
// Vosk is a lightweight offline speech recognition toolkit. The vosk-browser
// package compiles it to WASM so it runs entirely in the browser. The model
// (~50 MB) is downloaded on first preload and cached.
//
// Unlike Web Speech API, Vosk supports streaming recognition (interim results
// while the user speaks) and works in Firefox (which doesn't support Web Speech).

import type { VoiceProvider, VoiceError } from '@/lib/voice/types';

// Model URL — Vosk provides a small English model for browser use.
// For multi-language support, swap this URL to the appropriate model.
const VOSK_MODEL_URL = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip';

// Loose typing for the vosk-browser module
type VoskModule = {
  createModel: (url: string) => Promise<{
    registerListener: (cb: (msg: any) => void) => void;
    unregisterListener: (cb: (msg: any) => void) => void;
    transcribe: (audio: Float32Array) => Promise<void>;
    terminate: () => void;
  }>;
  SpeakerModel?: any;
};

type VoskRecognizer = {
  registerListener: (cb: (msg: any) => void) => void;
  unregisterListener: (cb: (msg: any) => void) => void;
  transcribe: (audio: Float32Array) => Promise<void>;
  terminate: () => void;
};

let _model: VoskRecognizer | null = null;
let _loadingPromise: Promise<VoskRecognizer> | null = null;

async function getVoskModule(): Promise<VoskModule> {
  const mod = await import('vosk-browser');
  return mod as unknown as VoskModule;
}

async function getModel(onProgress?: (pct: number) => void): Promise<VoskRecognizer> {
  if (_model) return _model;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const mod = await getVoskModule();
    // vosk-browser's createModel fetches + unzips the model from the URL.
    // There's no built-in progress callback, so we simulate one with a timer.
    if (onProgress) {
      let pct = 0;
      const interval = setInterval(() => {
        pct = Math.min(pct + 5, 90);
        onProgress(pct);
      }, 500);
      try {
        const model = await mod.createModel(VOSK_MODEL_URL);
        clearInterval(interval);
        onProgress(100);
        _model = model;
        return model;
      } catch (err) {
        clearInterval(interval);
        throw err;
      }
    }
    const model = await mod.createModel(VOSK_MODEL_URL);
    _model = model;
    return model;
  })();

  return _loadingPromise;
}

export class VoskVoiceProvider implements VoiceProvider {
  private listening = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private resultCbs: Set<(text: string, isFinal: boolean) => void> = new Set();
  private errorCbs: Set<(err: VoiceError) => void> = new Set();
  private stateCbs: Set<(listening: boolean) => void> = new Set();

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'MediaRecorder' in window && 'AudioContext' in window;
  }

  isListening(): boolean {
    return this.listening;
  }

  /** Preload the Vosk model. Call from Settings to download ahead of time. */
  static async preload(onProgress?: (pct: number) => void): Promise<void> {
    await getModel(onProgress);
  }

  /** Unload the Vosk model from memory. */
  static unload(): void {
    if (_model) {
      try {
        _model.terminate();
      } catch {
        // ignore
      }
    }
    _model = null;
    _loadingPromise = null;
  }

  async start(lang: string): Promise<void> {
    if (!this.isSupported()) {
      this.emitError({ code: 'not-supported', message: 'Vosk requires MediaRecorder + AudioContext support.' });
      return;
    }
    if (this.listening) return;

    try {
      await getModel();

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      this.mediaRecorder = new MediaRecorder(this.stream);
      const chunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioBuffer = await this.decodeBlob(blob);
        const float32 = audioBuffer.getChannelData(0);

        try {
          const model = await getModel();
          let finalText = '';
          const listener = (msg: any) => {
            if (msg?.result?.text) {
              finalText = msg.result.text;
              this.emitResult(msg.result.text, false);
            }
          };
          model.registerListener(listener);
          await model.transcribe(float32);
          model.unregisterListener(listener);
          if (finalText.trim()) {
            this.emitResult(finalText.trim(), true);
          }
        } catch (err: any) {
          this.emitError({ code: 'unknown', message: 'Vosk transcription failed: ' + (err?.message ?? '') });
        }

        this.listening = false;
        this.emitState(false);
        this.cleanup();
      };

      this.mediaRecorder.start();
      this.listening = true;
      this.emitState(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (this.listening) this.stop();
      }, 10000);
    } catch (err: any) {
      this.emitError({ code: 'audio-capture', message: 'Could not access microphone: ' + (err?.message ?? '') });
      this.cleanup();
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
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

  private async decodeBlob(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    return this.audioContext!.decodeAudioData(arrayBuffer);
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.mediaRecorder = null;
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
}
