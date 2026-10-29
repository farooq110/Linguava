// src/app/sign-in/page.tsx
import { Suspense } from 'react';
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';
import { SignInForm } from '@/components/auth/sign-in-form';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <AuthFormWrapper
      title="Welcome back"
      subtitle="Sign in to continue translating."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Get started free
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </AuthFormWrapper>
  );
}
