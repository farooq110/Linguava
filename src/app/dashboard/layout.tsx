// src/app/dashboard/layout.tsx
// Auth-guarded dashboard shell. Sidebar on desktop, sheet on mobile.

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/dashboard');
  }
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:block w-64 border-r bg-card shrink-0">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
