// src/lib/ai/translation-provider.ts
// Adapter interface for translation backends.
// To swap to Google Translate / DeepL / OpenAI: implement this interface
// in a new file (e.g. `google-translate-provider.ts`) and change the factory
// in `./index.ts` to return it.
//
// Example (Google Translate):
//   export class GoogleTranslateProvider implements TranslationProvider {
//     async translate(text, from, to) { ... call google translate API ... }
//     async detectLanguage(text) { ... call google detect API ... }
//   }

import type { Language } from '@/lib/languages';

export interface TranslationProvider {
  /**
   * Translate `text` from source language `from` to target language `to`.
   * `from` may be the special string 'auto' for auto-detection.
   * Returns only the translated text (no explanation).
   */
  translate(text: string, from: string, to: string): Promise<string>;

  /**
   * Detect the most likely ISO 639-1 language code for `text`.
   * Returns the code (e.g. 'es') and a confidence value 0..1.
   */
  detectLanguage(text: string): Promise<{ language: string; confidence: number }>;
}

export type { Language };
