// src/app/forgot-password/page.tsx
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <AuthFormWrapper
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/sign-in" className="text-primary hover:underline">
          Back to sign-in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthFormWrapper>
  );
}
