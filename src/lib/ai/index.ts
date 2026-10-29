// src/lib/ai/index.ts
// Factory for the active TranslationProvider.
// Swap implementations by editing this file only.
//
// The model ID is read from the request header `x-translation-model` (set by
// the translate API route from the user's session). Falls back to the default
// model if not set.

import { ZAiTranslationProvider } from '@/lib/ai/z-ai-provider';
import type { TranslationProvider } from '@/lib/ai/translation-provider';

// Cache providers by model ID so we don't re-create the ZAI client on every
// request (ZAI.create() is async + reads config).
const _providers = new Map<string, TranslationProvider>();

export function getTranslationProvider(modelId: string = 'glm-4-flash'): TranslationProvider {
  let provider = _providers.get(modelId);
  if (!provider) {
    provider = new ZAiTranslationProvider(modelId);
    _providers.set(modelId, provider);
  }
  return provider;
}

export type { TranslationProvider };
