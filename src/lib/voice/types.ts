// src/lib/voice/types.ts
// Adapter interface for speech-to-text (voice input).
// To swap to Azure Speech / Whisper / Deepgram: implement this interface
// in a new file (e.g. `azure-speech.ts`) and update the factory in
// `speech-recognition.ts` to return it.
//
// The default impl uses the browser's Web Speech API, so it has no
// network cost but only works in Chrome/Edge/Safari.

export interface VoiceProvider {
  /** Begin listening. Results stream via `onResult`. */
  start(lang: string): void;
  /** Stop listening. */
  stop(): void;
  /** Whether the engine is currently listening. */
  isListening(): boolean;
  /** Subscribe to interim & final transcripts. */
  onResult(cb: (text: string, isFinal: boolean) => void): () => void;
  /** Subscribe to error events. */
  onError(cb: (err: VoiceError) => void): () => void;
  /** Subscribe to listening-state changes. */
  onStateChange(cb: (listening: boolean) => void): () => void;
  /** Whether this provider is supported in the current environment. */
  isSupported(): boolean;
}

export type VoiceError = {
  code: 'not-supported' | 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'unknown';
  message: string;
};
