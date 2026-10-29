// src/components/dashboard/settings-form.tsx
// Full settings form: profile + default languages + translation engine +
// voice engine + model preload/unload UI.
//
// All sections POST to /api/settings which persists to the User table.
// The model preload/unload happens client-side (browser memory) via the
// model store + voice factory.

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Download, Trash2, CheckCircle2, Zap, Mic, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguagePicker } from '@/components/translator/language-picker';
import { profileSettingsSchema, type ProfileSettingsValues } from '@/lib/validation/schemas';
import { useSession } from 'next-auth/react';
import {
  TRANSLATION_MODELS,
  VOICE_MODELS,
  getTranslationModel,
  getVoiceModel,
  type ModelInfo,
} from '@/lib/models/registry';
import { useModelStore } from '@/lib/models/store';
import { preloadVoiceModel, unloadVoiceModel, isVoiceModelSupported } from '@/lib/voice';

export function SettingsForm({
  defaultName,
  defaultEmail,
  defaultPreferredLang,
  defaultSourceLang,
  defaultTargetLang,
  defaultTranslationModel,
  defaultVoiceModel,
}: {
  defaultName: string;
  defaultEmail: string;
  defaultPreferredLang: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
  defaultTranslationModel: string;
  defaultVoiceModel: string;
}) {
  const { update } = useSession();
  const [submitting, setSubmitting] = useState(false);

  // Model selection state (separate from the profile form so each can save
  // independently — model changes are instant, profile changes need a submit).
  const [selectedTranslationModel, setSelectedTranslationModel] = useState(defaultTranslationModel);
  const [selectedVoiceModel, setSelectedVoiceModel] = useState(defaultVoiceModel);

  // Preload state from the Zustand store (persists across reloads via localStorage).
  const {
    preloadedVoiceModel,
    loadStatus,
    loadProgress,
    loadError,
    setPreloadedVoiceModel,
    clearPreloadedVoiceModel,
    setLoadProgress,
    setLoadStatus,
  } = useModelStore();

  const form = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: defaultName,
      preferredLang: defaultPreferredLang,
    },
  });

  // ── Profile + language defaults submit ──────────────────────────────────
  async function onSubmit(values: ProfileSettingsValues) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          defaultSourceLang: form.watch('defaultSourceLang' as any) ?? defaultSourceLang,
          defaultTargetLang: form.watch('defaultTargetLang' as any) ?? defaultTargetLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save settings.');
        return;
      }
      await update?.();
      toast.success('Settings saved.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Translation model selection ─────────────────────────────────────────
  async function selectTranslationModel(modelId: string) {
    setSelectedTranslationModel(modelId);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translationModel: modelId }),
      });
      if (!res.ok) throw new Error();
      await update?.();
      toast.success(`Translation engine changed to ${getTranslationModel(modelId).name}.`);
    } catch {
      toast.error('Could not change translation engine.');
      setSelectedTranslationModel(defaultTranslationModel);
    }
  }

  // ── Voice model selection ───────────────────────────────────────────────
  async function selectVoiceModel(modelId: string) {
    setSelectedVoiceModel(modelId);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceModel: modelId }),
      });
      if (!res.ok) throw new Error();
      await update?.();
      toast.success(`Voice engine changed to ${getVoiceModel(modelId).name}.`);
    } catch {
      toast.error('Could not change voice engine.');
      setSelectedVoiceModel(defaultVoiceModel);
    }
  }

  // ── Preload / unload voice model ────────────────────────────────────────
  async function handlePreload(modelId: string) {
    // Single-preload rule: unload any other model first.
    if (preloadedVoiceModel && preloadedVoiceModel !== modelId) {
      unloadVoiceModel(preloadedVoiceModel);
    }

    setLoadStatus('loading');
    setLoadProgress(0);
    try {
      await preloadVoiceModel(modelId, (pct) => setLoadProgress(pct));
      setPreloadedVoiceModel(modelId);
      toast.success(`${getVoiceModel(modelId).name} preloaded and ready.`);
    } catch (err: any) {
      setLoadStatus('error', err?.message ?? 'Preload failed.');
      toast.error(`Failed to preload: ${err?.message ?? 'unknown error'}`);
    }
  }

  function handleUnload(modelId: string) {
    unloadVoiceModel(modelId);
    clearPreloadedVoiceModel();
    toast.success(`${getVoiceModel(modelId).name} unloaded from memory.`);
  }

  // ── Render helpers ──────────────────────────────────────────────────────
  function renderModelCard(
    model: ModelInfo,
    isSelected: boolean,
    onSelect: (id: string) => void,
    isPreloaded?: boolean,
    onPreload?: (id: string) => void,
    onUnload?: (id: string) => void,
  ) {
    const supported = model.clientSide ? isVoiceModelSupported(model.id) : true;
    const isLoading =
      loadStatus === 'loading' && preloadedVoiceModel !== model.id && selectedVoiceModel === model.id;
    const isThisPreloaded = preloadedVoiceModel === model.id;

    return (
      <div
        key={model.id}
        className={`rounded-lg border p-3 transition-colors ${
          isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{model.name}</span>
              {model.isDefault ? (
                <Badge variant="secondary" className="text-[10px] py-0">Default</Badge>
              ) : null}
              {model.tag ? (
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 ${
                    model.tag === 'recommended'
                      ? 'border-emerald-400 text-emerald-600'
                      : model.tag === 'free'
                        ? 'border-blue-400 text-blue-600'
                        : model.tag === 'paid'
                          ? 'border-amber-400 text-amber-600'
                          : ''
                  }`}
                >
                  {model.tag}
                </Badge>
              ) : null}
              {isThisPreloaded ? (
                <Badge variant="outline" className="text-[10px] py-0 border-emerald-400 text-emerald-600">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  Preloaded
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
            {model.downloadSizeMB > 0 ? (
              <p className="text-[10px] text-muted-foreground mt-1">~{model.downloadSizeMB} MB download</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(model.id)}
            disabled={!supported}
            className="shrink-0 text-xs"
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>

        {/* Preload / unload controls for voice models */}
        {model.preloadable && supported ? (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {isThisPreloaded ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => onUnload?.(model.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Unload
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => onPreload?.(model.id)}
                disabled={loadStatus === 'loading'}
              >
                {loadStatus === 'loading' && selectedVoiceModel === model.id ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                {loadStatus === 'loading' && selectedVoiceModel === model.id
                  ? `Loading ${loadProgress}%`
                  : 'Preload'}
              </Button>
            )}
            {loadStatus === 'loading' && selectedVoiceModel === model.id ? (
              <div className="flex-1 min-w-[100px] h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            ) : null}
            {loadStatus === 'error' && selectedVoiceModel === model.id ? (
              <span className="text-[10px] text-destructive">Failed to load</span>
            ) : null}
          </div>
        ) : null}

        {!supported ? (
          <p className="text-[10px] text-destructive mt-1">Not supported in this browser</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Profile section ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={defaultEmail} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Preferred language</Label>
              <LanguagePicker
                value={form.watch('preferredLang')}
                onChange={(code) => form.setValue('preferredLang', code)}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Default languages section ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Default Languages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set the default source and target languages for the translator. These are pre-selected
            when you open the translator page.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default source language (translate from)</Label>
              <LanguagePicker
                value={defaultSourceLang}
                onChange={async (code) => {
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ defaultSourceLang: code }),
                    });
                    if (!res.ok) throw new Error();
                    await update?.();
                    toast.success('Default source language updated.');
                  } catch {
                    toast.error('Could not update default source language.');
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Default target language (translate to)</Label>
              <LanguagePicker
                value={defaultTargetLang}
                onChange={async (code) => {
                  try {
                    const res = await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ defaultTargetLang: code }),
                    });
                    if (!res.ok) throw new Error();
                    await update?.();
                    toast.success('Default target language updated.');
                  } catch {
                    toast.error('Could not update default target language.');
                  }
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Note: Free plan users can only translate to English. Upgrade to Diamond or Premium for any language.
          </p>
        </CardContent>
      </Card>

      {/* ── Translation engine section ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Translation Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the AI model used for translations. The current model is selected by default.
            Server-side models are always available — no preloading needed.
          </p>
          <div className="space-y-2">
            {TRANSLATION_MODELS.map((model) =>
              renderModelCard(model, selectedTranslationModel === model.id, selectTranslationModel),
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Voice engine section ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Voice-to-Text Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the speech recognition engine. Browser-based models (HuggingFace, Vosk) need
            preloading — click <strong>Preload</strong> to download the model. Only one model can
            be preloaded at a time; loading a new one unloads the previous.
          </p>
          <div className="space-y-2">
            {VOICE_MODELS.map((model) =>
              renderModelCard(
                model,
                selectedVoiceModel === model.id,
                selectVoiceModel,
                preloadedVoiceModel === model.id,
                handlePreload,
                handleUnload,
              ),
            )}
          </div>
          {loadError ? (
            <p className="text-xs text-destructive mt-2">Error: {loadError}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
