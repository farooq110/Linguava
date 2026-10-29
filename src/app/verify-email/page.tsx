// src/app/verify-email/page.tsx
// Email verification landing page. In this sandbox we auto-verify on first Google login,
// and credentials users can verify by clicking a link sent via SMTP (not wired here).
// This page is a placeholder that informs the user of the next steps.

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';

export default function VerifyEmailPage() {
  return (
    <AuthFormWrapper title="Check your inbox" subtitle="We sent a verification link to your email.">
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center py-4">
          <div className="rounded-full bg-primary/10 p-4">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Click the link in the email to verify your address. If you don&apos;t see it within a minute, check your spam folder.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/sign-in">Continue to sign-in</Link>
        </Button>
      </div>
    </AuthFormWrapper>
  );
}
