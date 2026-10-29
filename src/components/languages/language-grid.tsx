// src/components/languages/language-grid.tsx
// Searchable, responsive grid of language cards.

'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';
import { LanguageCard } from '@/components/languages/language-card';

export function LanguageGrid({ linkable = true }: { linkable?: boolean }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages…"
          className="pl-9"
          aria-label="Search languages"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {LANGUAGES.length} languages.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((l) => (
          <LanguageCard key={l.code} lang={l} href={linkable ? `/dashboard/translate/${l.code}` : undefined} />
        ))}
      </div>
    </div>
  );
}
