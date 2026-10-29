// src/app/reset-password/page.tsx
import { Suspense } from 'react';
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <AuthFormWrapper
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <Link href="/sign-in" className="text-primary hover:underline">
          Back to sign-in
        </Link>
      }
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthFormWrapper>
  );
}
