// src/lib/voice/huggingface-provider.ts
// VoiceProvider implementation using @huggingface/transformers (Whisper).
//
// This runs OpenAI's Whisper model entirely in the browser via WebAssembly.
// The model weights (~40-80 MB) are downloaded on first preload and cached
// by the browser. After preloading, transcription works offline.
//
// The model is loaded lazily on first start() call if not already preloaded.
// Use preload() to download ahead of time (e.g. from the Settings page).

import type { VoiceProvider, VoiceError } from '@/lib/voice/types';

// Type for the transformers.js pipeline — we use a loose typing because the
// SDK's TypeScript types are heavy and we only call a few methods.
type Pipeline = {
  (audio: Float32Array): Promise<{ text: string }[] | { text: string }>;
};

type TransformersModule = {
  pipeline: (task: string, model: string, options?: any) => Promise<Pipeline>;
  env: {
    allowRemoteModels: boolean;
    allowLocalModels: boolean;
    useBrowserCache: boolean;
  };
};

// Whisper model sizes: 'tiny' is fastest, 'base' is a good balance.
// The model ID maps to HuggingFace Hub repos.
const WHISPER_MODEL = 'Xenova/whisper-tiny';

let _pipeline: Pipeline | null = null;
let _loadingPromise: Promise<Pipeline> | null = null;

async function getTransformers(): Promise<TransformersModule> {
  // Dynamic import so the heavy WASM module isn't loaded on every page.
  // It's only imported when the user selects the HuggingFace engine.
  const mod = await import('@huggingface/transformers');
  // Configure for browser usage
  (mod as any).env.allowRemoteModels = true;
  (mod as any).env.allowLocalModels = false;
  (mod as any).env.useBrowserCache = true;
  return mod as unknown as TransformersModule;
}

async function getPipeline(onProgress?: (pct: number) => void): Promise<Pipeline> {
  if (_pipeline) return _pipeline;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const transformers = await getTransformers();
    const pipe = await transformers.pipeline('automatic-speech-recognition', WHISPER_MODEL, {
      // progress callback fires during model download
      progress_callback: (data: any) => {
        if (data?.status === 'progress' && data.total > 0 && onProgress) {
          onProgress(Math.round((data.loaded / data.total) * 100));
        }
      },
    });
    _pipeline = pipe;
    return pipe;
  })();

  return _loadingPromise;
}

export class HuggingFaceVoiceProvider implements VoiceProvider {
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

  /** Preload the model. Call this from Settings to download ahead of time. */
  static async preload(onProgress?: (pct: number) => void): Promise<void> {
    await getPipeline(onProgress);
  }

  /** Unload the model from memory. */
  static unload(): void {
    _pipeline = null;
    _loadingPromise = null;
  }

  async start(lang: string): Promise<void> {
    if (!this.isSupported()) {
      this.emitError({ code: 'not-supported', message: 'HuggingFace voice requires MediaRecorder + AudioContext support.' });
      return;
    }
    if (this.listening) return;

    try {
      // Ensure the model is loaded (lazy load on first use)
      await getPipeline();

      // Capture microphone audio
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
          const pipe = await getPipeline();
          const output = await pipe(float32);
          const text = Array.isArray(output) ? output[0]?.text ?? '' : output.text ?? '';
          if (text.trim()) {
            this.emitResult(text.trim(), true);
          }
        } catch (err: any) {
          this.emitError({ code: 'unknown', message: 'Transcription failed: ' + (err?.message ?? 'unknown error') });
        }

        this.listening = false;
        this.emitState(false);
        this.cleanup();
      };

      this.mediaRecorder.start();
      this.listening = true;
      this.emitState(true);

      // Auto-stop after 10 seconds (Whisper processes in one chunk, not streaming)
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
