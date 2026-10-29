// src/lib/voice/index.ts
// Factory that returns the active VoiceProvider based on the user's selected
// voice model. Swappable: add a new provider in registry.ts + implement the
// adapter, then add a case here.
//
// This is a client-only module — voice providers run in the browser.

import type { VoiceProvider } from './types';
import { WebSpeechProvider } from './speech-recognition';
import { getVoiceModel } from '@/lib/models/registry';

let _currentModelId: string | null = null;
let _currentProvider: VoiceProvider | null = null;

// Cache of dynamically imported provider classes (so we don't re-import on
// every getVoiceProvider call).
const _providerCache = new Map<string, any>();

async function loadProviderClass(modelId: string): Promise<any> {
  if (_providerCache.has(modelId)) return _providerCache.get(modelId);
  let cls: any;
  if (modelId === 'huggingface') {
    const mod = await import('./huggingface-provider');
    cls = mod.HuggingFaceVoiceProvider;
  } else if (modelId === 'vosk') {
    const mod = await import('./vosk-provider');
    cls = mod.VoskVoiceProvider;
  } else {
    cls = WebSpeechProvider;
  }
  _providerCache.set(modelId, cls);
  return cls;
}

/**
 * Get the VoiceProvider for the given model ID.
 * For web-speech (default) this is synchronous. For huggingface/vosk it
 * returns a WebSpeechProvider stub immediately and the real provider loads
 * async on first start() call — see VoiceInputButton for the async start.
 */
export function getVoiceProvider(modelId?: string): VoiceProvider {
  const id = modelId || 'web-speech';

  // If the model hasn't changed, reuse the existing provider instance.
  if (_currentProvider && _currentModelId === id) {
    return _currentProvider;
  }

  // Unload the previous provider's resources if switching.
  if (_currentProvider && _currentModelId && _currentModelId !== id) {
    unloadVoiceModel(_currentModelId);
  }

  // For web-speech we can create synchronously. For others, we create a
  // WebSpeechProvider as a fallback — the VoiceInputButton calls start()
  // which is async and will use the correct provider via the async path.
  // The real provider class is loaded lazily inside start().
  let provider: VoiceProvider;
  if (id === 'web-speech') {
    provider = new WebSpeechProvider();
  } else {
    // Return a lazy proxy that loads the real provider on first method call.
    // This keeps getVoiceProvider synchronous (matching the VoiceProvider interface).
    provider = createLazyProvider(id);
  }

  _currentModelId = id;
  _currentProvider = provider;
  return provider;
}

/**
 * Creates a VoiceProvider that lazily loads the real implementation on first
 * use. All methods are async even though the interface declares some as sync
 * — this works because VoiceInputButton already awaits start() and the
 * onResult/onError/onStateChange subscriptions are set up synchronously
 * (they just register callbacks on a Set that the real provider will fire
 * once loaded).
 */
function createLazyProvider(modelId: string): VoiceProvider {
  let realProvider: VoiceProvider | null = null;
  const resultCbs = new Set<(text: string, isFinal: boolean) => void>();
  const errorCbs = new Set<(err: any) => void>();
  const stateCbs = new Set<(listening: boolean) => void>();

  async function ensureReal(): Promise<VoiceProvider> {
    if (realProvider) return realProvider;
    const cls = await loadProviderClass(modelId);
    realProvider = new cls();
    // Transfer all registered callbacks to the real provider.
    resultCbs.forEach((cb) => realProvider!.onResult(cb));
    errorCbs.forEach((cb) => realProvider!.onError(cb));
    stateCbs.forEach((cb) => realProvider!.onStateChange(cb));
    return realProvider;
  }

  return {
    async start(lang: string) {
      const p = await ensureReal();
      return p.start(lang);
    },
    stop() {
      realProvider?.stop();
    },
    isListening() {
      return realProvider?.isListening() ?? false;
    },
    onResult(cb) {
      resultCbs.add(cb);
      if (realProvider) realProvider.onResult(cb);
      return () => {
        resultCbs.delete(cb);
      };
    },
    onError(cb) {
      errorCbs.add(cb);
      if (realProvider) realProvider.onError(cb);
      return () => {
        errorCbs.delete(cb);
      };
    },
    onStateChange(cb) {
      stateCbs.add(cb);
      if (realProvider) realProvider.onStateChange(cb);
      return () => {
        stateCbs.delete(cb);
      };
    },
    isSupported() {
      if (realProvider) return realProvider.isSupported();
      // Pre-check: huggingface + vosk need MediaRecorder + AudioContext
      if (typeof window === 'undefined') return false;
      return 'MediaRecorder' in window && 'AudioContext' in window;
    },
  };
}

/**
 * Preload a voice model's weights into browser memory.
 * Only applies to models with preloadable=true (huggingface, vosk).
 * Web Speech API needs no preloading.
 */
export async function preloadVoiceModel(
  modelId: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const model = getVoiceModel(modelId);
  if (!model.preloadable) return;

  if (modelId === 'huggingface') {
    const mod = await import('./huggingface-provider');
    await mod.HuggingFaceVoiceProvider.preload(onProgress);
  } else if (modelId === 'vosk') {
    const mod = await import('./vosk-provider');
    await mod.VoskVoiceProvider.preload(onProgress);
  }
}

/**
 * Unload a voice model from browser memory, freeing RAM.
 */
export function unloadVoiceModel(modelId: string): void {
  // These are sync calls on static methods — safe to invoke directly.
  // We use dynamic import's resolved module cache (the import() above caches).
  // For a clean sync unload, we access the module cache via the _providerCache.
  const cached = _providerCache.get(modelId);
  if (cached) {
    if (modelId === 'huggingface' && cached.unload) {
      cached.unload();
    } else if (modelId === 'vosk' && cached.unload) {
      cached.unload();
    }
  }

  if (_currentModelId === modelId) {
    _currentModelId = null;
    _currentProvider = null;
  }
}

/**
 * Check if a voice model is supported in the current browser.
 */
export function isVoiceModelSupported(modelId: string): boolean {
  if (modelId === 'web-speech') {
    if (typeof window === 'undefined') return false;
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }
  // huggingface + vosk both need MediaRecorder + AudioContext
  if (typeof window === 'undefined') return false;
  return 'MediaRecorder' in window && 'AudioContext' in window;
}
