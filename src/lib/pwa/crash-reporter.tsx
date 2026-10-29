// src/lib/pwa/crash-reporter.tsx
// Global window.onerror + unhandledrejection handler that POSTs to /api/analytics/crash.

'use client';

import { useEffect } from 'react';

export function CrashReporter() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const send = (payload: {
      message: string;
      stack?: string;
      url?: string;
      userAgent?: string;
    }) => {
      try {
        fetch('/api/analytics/crash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: payload.message.slice(0, 2000),
            stack: payload.stack?.slice(0, 8000),
            url: window.location.href.slice(0, 500),
            userAgent: navigator.userAgent.slice(0, 500),
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // ignore
      }
    };
    const onError = (event: ErrorEvent) => {
      send({
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      send({
        message:
          (reason && (reason.message || String(reason))) ||
          'Unhandled promise rejection',
        stack: reason?.stack,
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
