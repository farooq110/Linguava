// src/lib/ai/z-ai-provider.ts
// Default TranslationProvider implementation backed by z-ai-web-dev-sdk.
// The SDK exposes ZAI.create() which returns an object with chat.completions.create.
// We use a system prompt to instruct the model to act as a translator, and ask it
// to respond with ONLY the translation. For language detection we use a JSON-only prompt.
//
// To swap: implement `TranslationProvider` against Google Cloud Translate / DeepL / OpenAI
// and update `./index.ts` to return your new provider.

import ZAI from 'z-ai-web-dev-sdk';
import type { TranslationProvider } from '@/lib/ai/translation-provider';
import { getLanguageName } from '@/lib/languages';

function normalizeCode(code: string): string {
  if (!code) return 'en';
  return code.trim().toLowerCase().split('-')[0];
}

export class ZAiTranslationProvider implements TranslationProvider {
  private modelId: string;

  constructor(modelId: string = 'glm-4-flash') {
    this.modelId = modelId;
  }

  private async getZai() {
    // ZAI.create() reads ~/.z-ai-config or ./.z-ai-config (baseUrl + apiKey).
    // It is lazy and cheap — calling per request is fine but caching helps.
    const zai = await ZAI.create();
    return zai;
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    const fromName = from === 'auto' || !from ? 'the auto-detected source language' : getLanguageName(from);
    const toName = getLanguageName(to);

    const zai = await this.getZai();
    let completion;
    try {
      completion = await zai.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the user's text from ${fromName} to ${toName}. Reply with ONLY the translation — no quotation marks, no explanations, no notes.`,
          },
          { role: 'user', content: text },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.2,
      });
    } catch (err: any) {
      // Z.AI's free model can return 429 ("Too many requests") under load.
      // Surface a friendly error rather than the raw SDK stack trace.
      const msg = String(err?.message ?? '');
      if (msg.includes('429')) {
        throw new Error('The translation service is busy right now. Please wait a moment and try again.');
      }
      throw err;
    }

    const content = completion?.choices?.[0]?.message?.content ?? '';
    // Some models wrap output in quotes; strip them.
    return content.trim().replace(/^["'“”]+|["'“”]+$/g, '').trim();
  }

  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    const zai = await this.getZai();
    const completion = await zai.chat.completions.create({
      model: this.modelId,
      messages: [
        {
          role: 'system',
          content:
            "You are a language detection engine. Given a piece of text, output ONLY a JSON object with two keys: \"language\" (ISO 639-1 code, e.g. \"es\", \"en\", \"zh\", \"ja\") and \"confidence\" (a number between 0 and 1). Do not include any other text.",
        },
        { role: 'user', content: text.slice(0, 1000) },
      ],
      thinking: { type: 'disabled' },
      temperature: 0,
    });

    const content = (completion?.choices?.[0]?.message?.content ?? '').trim();
    // Extract the first {...} block — defensive against models that add prose.
    const match = content.match(/\{[\s\S]*?\}/);
    if (!match) {
      return { language: 'en', confidence: 0.3 };
    }
    try {
      const parsed = JSON.parse(match[0]) as { language?: string; confidence?: number };
      return {
        language: normalizeCode(parsed.language ?? 'en'),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch {
      return { language: 'en', confidence: 0.3 };
    }
  }
}
