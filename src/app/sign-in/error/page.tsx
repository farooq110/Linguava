// src/app/sign-in/error/page.tsx
// Reached when NextAuth redirects with ?error=...

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';

export default function SignInErrorPage() {
  return (
    <AuthFormWrapper title="Sign-in problem" subtitle="We couldn't complete your sign-in.">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Sign-in failed</p>
            <p className="text-muted-foreground mt-1">
              Your credentials may be incorrect, or the session expired. Please try again.
            </p>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link href="/sign-in">Back to sign-in</Link>
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Forgot your password?{' '}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Reset it
          </Link>
        </div>
      </div>
    </AuthFormWrapper>
  );
}
