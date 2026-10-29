// src/components/auth/auth-form-wrapper.tsx
// Shared shell for all auth pages: logo, title, subtitle, social proof footer.

import { ReactNode } from 'react';
import Link from 'next/link';
import { Languages } from 'lucide-react';

export function AuthFormWrapper({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
            <Languages className="h-4 w-4" />
          </span>
          Linguava
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
