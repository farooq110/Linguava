// src/lib/pwa/register-sw.tsx
// Client component that registers /sw.js on mount.
// Swap to next-pwa by removing this file and configuring next-pwa in next.config.

'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // avoid stale SW in dev
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent — service worker is a progressive enhancement.
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
