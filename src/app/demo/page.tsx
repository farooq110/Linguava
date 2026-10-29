// src/app/demo/page.tsx
// Guest demo page. No auth, 5 translations/IP, limited to 5 languages.

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TranslatorClient } from '@/components/translator/translator-client';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function DemoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            Linguava
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                Get started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Try Linguava free</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Translate between Urdu, English, Spanish, French, German and Japanese. No account needed — translate as much as you like.
          </p>
        </div>
        <TranslatorClient mode="demo" />
        <div className="mt-8 rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Ready for the full experience? Unlock 80+ languages, voice input, and history.
          </p>
          <Button asChild className="mt-3">
            <Link href="/register">Create your free account</Link>
          </Button>
        </div>
      </main>
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground border-t">
        Linguava — Translate the world.
      </footer>
    </div>
  );
}
