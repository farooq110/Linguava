// src/app/layout.tsx
// Root layout: providers, manifest link, theme color, fonts.

import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Linguava — Translate 80+ languages with text and voice',
  description:
    'Linguava is a fast, free AI translator with 80+ languages, voice input, chat history, and a Progressive Web App experience.',
  keywords: ['translation', 'translator', 'AI', 'languages', 'voice input', 'PWA'],
  authors: [{ name: 'Linguava' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
  openGraph: {
    title: 'Linguava — Translate 80+ languages',
    description: 'AI-powered translation with voice input and chat history.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linguava',
    description: 'Translate 80+ languages with text and voice.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
