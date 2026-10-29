// src/components/languages/language-card.tsx
// Card showing flag + name + native name + RTL badge.

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Language } from '@/lib/languages';

export function LanguageCard({ lang, href }: { lang: Language; href?: string }) {
  const inner = (
    <Card className="hover:shadow-md hover:border-primary/40 transition-all h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>{lang.flag}</span>
          <div className="min-w-0">
            <p className="font-medium truncate">{lang.name}</p>
            <p className="text-xs text-muted-foreground truncate">{lang.nativeName}</p>
          </div>
          {lang.rtl ? (
            <Badge variant="secondary" className="ml-auto text-[10px]">RTL</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
