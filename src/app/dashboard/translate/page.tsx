// src/app/dashboard/translate/page.tsx
// Default translator page.

import { Topbar } from '@/components/dashboard/topbar';
import { TranslatorClient } from '@/components/translator/translator-client';

export default function TranslatePage() {
  return (
    <>
      <Topbar title="Translate" />
      <main className="flex-1 p-4 sm:p-6">
        <TranslatorClient mode="auth" />
      </main>
    </>
  );
}
