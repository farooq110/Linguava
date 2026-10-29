// src/lib/models/registry.ts
// Central registry of all available AI engines (models) the user can choose
// from in the Settings page. Each entry carries metadata for the UI plus a
// unique `id` that the backend / client factory uses to instantiate the
// right provider.
//
// To add a new engine: add an entry to TRANSLATION_MODELS or VOICE_MODELS
// below, then implement the provider adapter and wire it in the factory
// (src/lib/ai/index.ts for translation, src/lib/voice/index.ts for voice).

export type ModelCategory = 'translation' | 'voice';

export interface ModelInfo {
  /** Unique identifier stored in the User table + used by factories. */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** Short description of the engine. */
  description: string;
  /** Whether this is the default selection for new users. */
  isDefault: boolean;
  /** Whether the engine runs entirely in the browser (no server round-trip). */
  clientSide: boolean;
  /** Approximate download size for preloading (MB). 0 = no download needed. */
  downloadSizeMB: number;
  /** Whether preloading is supported (some engines like Web Speech don't need it). */
  preloadable: boolean;
  /** Whether a plan upgrade is required (e.g. premium-only models). */
  requiresPlan?: 'diamond' | 'premium';
  /** Tag for UI badges. */
  tag?: 'free' | 'paid' | 'browser' | 'cloud' | 'recommended';
}

// ── Translation engines (server-side AI models) ────────────────────────────
export const TRANSLATION_MODELS: ModelInfo[] = [
  {
    id: 'glm-4-flash',
    name: 'GLM-4-Flash',
    description:
      'Free, fast translation model via Z.AI. Great for everyday use. No API key required.',
    isDefault: true,
    clientSide: false,
    downloadSizeMB: 0,
    preloadable: false,
    tag: 'free',
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    description:
      'Higher-quality model via Z.AI. Better nuance for complex sentences. Slower than Flash.',
    isDefault: false,
    clientSide: false,
    downloadSizeMB: 0,
    preloadable: false,
    requiresPlan: 'premium',
    tag: 'paid',
  },
];

// ── Voice-to-text engines (STT) ────────────────────────────────────────────
export const VOICE_MODELS: ModelInfo[] = [
  {
    id: 'web-speech',
    name: 'Web Speech API',
    description:
      'Built into Chrome, Edge, and Safari. Zero download, instant start. Best default choice.',
    isDefault: true,
    clientSide: true,
    downloadSizeMB: 0,
    preloadable: false,
    tag: 'browser',
  },
  {
    id: 'huggingface',
    name: 'HuggingFace Transformers',
    description:
      'OpenAI Whisper running in-browser via @huggingface/transformers (WASM). Works offline after preload. ~40-80 MB download.',
    isDefault: false,
    clientSide: true,
    downloadSizeMB: 80,
    preloadable: true,
    tag: 'recommended',
  },
  {
    id: 'vosk',
    name: 'Vosk (WebAssembly)',
    description:
      'Lightweight offline speech recognition via vosk-browser. ~50 MB model download. Great for low-resource languages.',
    isDefault: false,
    clientSide: true,
    downloadSizeMB: 50,
    preloadable: true,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getTranslationModel(id: string): ModelInfo {
  return TRANSLATION_MODELS.find((m) => m.id === id) ?? TRANSLATION_MODELS[0];
}

export function getVoiceModel(id: string): ModelInfo {
  return VOICE_MODELS.find((m) => m.id === id) ?? VOICE_MODELS[0];
}

export function getDefaultTranslationModel(): ModelInfo {
  return TRANSLATION_MODELS.find((m) => m.isDefault) ?? TRANSLATION_MODELS[0];
}

export function getDefaultVoiceModel(): ModelInfo {
  return VOICE_MODELS.find((m) => m.isDefault) ?? VOICE_MODELS[0];
}
