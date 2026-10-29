// src/components/providers.tsx
// Wraps the app with all client-side providers:
//   - SessionProvider (NextAuth)
//   - ThemeProvider (next-themes, dark mode)
//   - QueryClientProvider (TanStack Query)
//   - Toaster (sonner)
//   - PWARegister + CrashReporter + InstallPrompt

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ReactNode, useState } from 'react';
import { PWARegister } from '@/lib/pwa/register-sw';
import { CrashReporter } from '@/lib/pwa/crash-reporter';
import { InstallPrompt } from '@/components/pwa/install-prompt';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={client}>
          {children}
          <Toaster richColors position="top-right" />
          <PWARegister />
          <CrashReporter />
          <InstallPrompt />
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
