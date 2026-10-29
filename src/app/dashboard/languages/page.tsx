// src/app/dashboard/languages/page.tsx
// Full language list page.

import { Topbar } from '@/components/dashboard/topbar';
import { LanguageGrid } from '@/components/languages/language-grid';

export default function LanguagesPage() {
  return (
    <>
      <Topbar title="Languages" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">All supported languages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Click any language to start translating to it. Free plan only allows English.
          </p>
        </div>
        <LanguageGrid />
      </main>
    </>
  );
}
