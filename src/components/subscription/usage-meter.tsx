// src/components/subscription/usage-meter.tsx
// Today's usage vs plan limits.

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UsageMeter({
  translationsUsed,
  translationsLimit,
  charsUsed,
  charsLimit,
}: {
  translationsUsed: number;
  translationsLimit: number;
  charsUsed: number;
  charsLimit: number;
}) {
  const tPct = translationsLimit === Infinity ? 0 : Math.min(100, (translationsUsed / translationsLimit) * 100);
  const cPct = Math.min(100, (charsUsed / charsLimit) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Translations</span>
            <span className="text-muted-foreground">
              {translationsUsed} / {translationsLimit === Infinity ? '∞' : translationsLimit}
            </span>
          </div>
          <Progress value={tPct} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Characters</span>
            <span className="text-muted-foreground">
              {charsUsed.toLocaleString()} / {charsLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={cPct} />
        </div>
      </CardContent>
    </Card>
  );
}
