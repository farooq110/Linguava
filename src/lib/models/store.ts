// src/lib/models/store.ts
// Client-side store for model preload/unload state.
//
// Tracks which voice model is currently "preloaded" (downloaded + ready in
// browser memory). Only ONE voice model can be preloaded at a time — loading
// a new one automatically unloads the previous one to free memory.
//
// Translation models are server-side (API calls) so they don't need
// preloading — selecting one in settings just stores the preference.
//
// The store is intentionally simple (Zustand + localStorage persistence) so
// the preload state survives page reloads within the same browser session.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ModelState {
  /** Which voice model ID is currently preloaded (null = none). */
  preloadedVoiceModel: string | null;
  /** Load progress 0-100 for the currently-loading model. */
  loadProgress: number;
  /** Status of the current/last load operation. */
  loadStatus: LoadStatus;
  /** Error message if the last load failed. */
  loadError: string | null;

  /** Mark a voice model as preloaded (unloads any other first). */
  setPreloadedVoiceModel: (modelId: string) => void;
  /** Clear the preloaded voice model (unload). */
  clearPreloadedVoiceModel: () => void;
  /** Update load progress. */
  setLoadProgress: (pct: number) => void;
  /** Set the load status. */
  setLoadStatus: (status: LoadStatus, error?: string | null) => void;
  /** Reset everything to initial state. */
  reset: () => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      preloadedVoiceModel: null,
      loadProgress: 0,
      loadStatus: 'idle',
      loadError: null,

      setPreloadedVoiceModel: (modelId) =>
        set({ preloadedVoiceModel: modelId, loadStatus: 'loaded', loadProgress: 100, loadError: null }),

      clearPreloadedVoiceModel: () =>
        set({ preloadedVoiceModel: null, loadStatus: 'idle', loadProgress: 0, loadError: null }),

      setLoadProgress: (pct) => set({ loadProgress: Math.round(pct) }),

      setLoadStatus: (status, error = null) => set({ loadStatus: status, loadError: error }),

      reset: () =>
        set({
          preloadedVoiceModel: null,
          loadProgress: 0,
          loadStatus: 'idle',
          loadError: null,
        }),
    }),
    {
      name: 'linguava-model-store',
      // Only persist the preloaded model ID, not transient load state.
      partialize: (state) => ({ preloadedVoiceModel: state.preloadedVoiceModel }),
    },
  ),
);
