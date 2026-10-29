// src/components/translator/language-picker.tsx
// Source/target language dropdown with flag + name + native name.
// Can be locked (disabled) — used for Free plan target language.

'use client';

import { LANGUAGES, AUTO_DETECT_CODE } from '@/lib/languages';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

export function LanguagePicker({
  value,
  onChange,
  allowAuto,
  locked,
  lockedReason,
  allowedCodes,
}: {
  value: string;
  onChange: (code: string) => void;
  allowAuto?: boolean;
  locked?: boolean;
  lockedReason?: string;
  allowedCodes?: string[]; // when set, restricts choices to these codes
}) {
  const langs = allowedCodes
    ? LANGUAGES.filter((l) => allowedCodes.includes(l.code))
    : LANGUAGES;

  const trigger = (
    <Select value={value} onValueChange={onChange} disabled={locked}>
      <SelectTrigger className="w-full" aria-label="Select language">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {allowAuto ? (
          <SelectItem value={AUTO_DETECT_CODE}>
            <span className="inline-flex items-center gap-2">
              <span>🌐</span>
              <span>Auto detect</span>
            </span>
          </SelectItem>
        ) : null}
        {langs.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>{l.flag}</span>
              <span>{l.name}</span>
              <span className="text-muted-foreground text-xs">({l.nativeName})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (locked && lockedReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {trigger}
              <Lock className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>{lockedReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return trigger;
}
