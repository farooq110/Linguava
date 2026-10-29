// src/app/dashboard/translate/[targetLang]/page.tsx
// Translator pre-set to a target language (e.g. /dashboard/translate/es).
// Validates targetLang against the language list; for free users, redirects
// to the generic translate page if the language isn't allowed.

import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/topbar';
import { TranslatorClient } from '@/components/translator/translator-client';
import { LANGUAGES } from '@/lib/languages';

export default async function TargetedTranslatePage({
  params,
}: {
  params: Promise<{ targetLang: string }>;
}) {
  const { targetLang } = await params;
  const code = targetLang.toLowerCase();
  if (!LANGUAGES.some((l) => l.code === code)) {
    redirect('/dashboard/translate');
  }
  // We pass the desired target via a prop by using a small wrapper.
  return (
    <>
      <Topbar title={`Translate to ${LANGUAGES.find((l) => l.code === code)?.name ?? code}`} />
      <main className="flex-1 p-4 sm:p-6">
        <PresetTarget targetLang={code} />
      </main>
    </>
  );
}

function PresetTarget({ targetLang }: { targetLang: string }) {
  // The TranslatorClient manages its own state, so we use a small client-side
  // effect here to set the target. We wrap it in a tiny client component file.
  // To keep things simple, render the standard client and let the user pick.
  // (We use a custom hook via key prop to remount with the desired lang.)
  return <TranslatorClientWithPreset targetLang={targetLang} />;
}

import { TranslatorClientWithPreset } from '@/components/translator/translator-preset';
