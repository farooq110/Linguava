// src/components/auth/forgot-password-form.tsx
// RHF + Zod. POSTs to /api/auth/forgot-password.
// In sandbox mode the API returns the reset URL (no SMTP); we toast it.

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validation/schemas';

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    setResetUrl(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not send reset email.');
        return;
      }
      if (data.resetUrl) {
        // Sandbox mode — no SMTP. Show the link directly.
        setResetUrl(data.resetUrl);
        toast.success('Reset link generated (sandbox mode).');
      } else {
        toast.success('If that email exists, a reset link is on its way.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>

      {resetUrl ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Reset link (sandbox)</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-xs">
              No SMTP server is configured, so we generated a reset link for you. In production this would be emailed.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
              <code className="flex-1 truncate text-xs">{resetUrl}</code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => {
                  navigator.clipboard.writeText(resetUrl);
                  toast.success('Link copied to clipboard.');
                }}
                aria-label="Copy link"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button asChild size="sm" className="w-full">
              <a href={resetUrl}>Open reset link</a>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
