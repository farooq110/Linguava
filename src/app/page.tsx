// src/app/page.tsx
// Landing page: hero + live demo CTA + features + pricing preview + languages marquee.

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Languages,
  Mic,
  History,
  Smartphone,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Check,
  Github,
  Globe,
} from 'lucide-react';
import { PLAN_LIST } from '@/lib/subscription/plans';
import { LANGUAGES } from '@/lib/languages';

const FEATURES = [
  {
    icon: Languages,
    title: '80+ languages',
    desc: 'Translate between every major language and dozens of regional ones — from Spanish to Maori.',
  },
  {
    icon: Mic,
    title: 'Voice input',
    desc: 'Speak naturally and let Linguava transcribe and translate in one step. Powered by Web Speech API.',
  },
  {
    icon: History,
    title: 'Chat history',
    desc: 'Every translation is saved so you can revisit phrases. Plans keep history for 7, 30, or 90 days.',
  },
  {
    icon: Smartphone,
    title: 'Installable PWA',
    desc: 'Add Linguava to your home screen and translate from anywhere, even offline for the app shell.',
  },
  {
    icon: Sparkles,
    title: 'Free AI engine',
    desc: 'Powered by a free AI model — no API keys to manage. Swap to Google Translate or DeepL anytime.',
  },
  {
    icon: ShieldCheck,
    title: 'Smart validation',
    desc: 'Linguava detects the source language and warns you if the wrong one is selected — fewer bad outputs.',
  },
];

export default function LandingPage() {
  const marquee = [...LANGUAGES.slice(0, 24), ...LANGUAGES.slice(0, 24)];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-6 py-5 sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Languages className="h-4 w-4" />
            </span>
            Linguava
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 pt-16 pb-12 sm:pt-24 sm:pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3 w-3 text-primary" />
              Powered by free AI — no API keys
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              Translate <span className="text-primary">80+ languages</span><br className="hidden sm:block" /> with text and voice.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Linguava is a fast, modern translator with voice input, smart language detection, chat history, and a Progressive Web App experience.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/register">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/demo">Try the demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Free plan includes 100 translations/day.
            </p>
          </div>
        </section>

        {/* Languages marquee */}
        <section className="border-y bg-muted/30 py-6 overflow-hidden">
          <div className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Translate between {LANGUAGES.length} languages
          </div>
          <div className="relative">
            <div className="flex gap-3 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
              {marquee.map((l, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm"
                >
                  <span aria-hidden>{l.flag}</span>
                  <span>{l.name}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight">Everything you need to translate</h2>
              <p className="mt-3 text-muted-foreground">
                Built for travelers, students, and professionals alike.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <Card key={f.title} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="mt-4 font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        <section className="px-6 py-16 sm:py-20 bg-muted/30 border-y">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
              <p className="mt-3 text-muted-foreground">Start free. Upgrade when you need more.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PLAN_LIST.map((p) => (
                <Card key={p.id} className={p.id === 'diamond' ? 'ring-1 ring-cyan-300/50' : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{p.name}</span>
                      {p.id === 'diamond' ? (
                        <span className="text-xs bg-cyan-600 text-white rounded-full px-2 py-0.5">Popular</span>
                      ) : null}
                    </CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-semibold">${p.price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground"> /mo</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {p.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant={p.id === 'free' ? 'outline' : 'default'} className="w-full mt-4">
                      <Link href="/register">Get started</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-6">
              <Button asChild variant="link">
                <Link href="/dashboard/subscription">
                  Compare all features <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 sm:py-20">
          <div className="max-w-4xl mx-auto text-center rounded-2xl border bg-card p-8 sm:p-12">
            <Globe className="h-10 w-10 text-primary mx-auto" />
            <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight">
              Start translating in seconds
            </h2>
            <p className="mt-2 text-muted-foreground">
              Create a free account or try the demo — no card required.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/register">Get started free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/demo">Try the demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="rounded-md bg-primary p-1 text-primary-foreground">
              <Languages className="h-3.5 w-3.5" />
            </span>
            <span>© {new Date().getFullYear()} Linguava</span>
          </div>
          <nav className="flex flex-wrap gap-4 text-muted-foreground">
            <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
            <Link href="/demo" className="hover:text-foreground">Demo</Link>
            <Link href="/register" className="hover:text-foreground">Get started</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1">
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
            <Link href="/dashboard/subscription" className="hover:text-foreground">Pricing</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
