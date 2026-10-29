// src/app/register/page.tsx
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';
import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <AuthFormWrapper
      title="Create your free account"
      subtitle="Start translating in seconds. No credit card required."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthFormWrapper>
  );
}
