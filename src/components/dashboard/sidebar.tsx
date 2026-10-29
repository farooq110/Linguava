// src/components/dashboard/sidebar.tsx
// Dashboard sidebar: nav links + plan badge + sign-out.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Languages,
  LayoutDashboard,
  History,
  CreditCard,
  BarChart3,
  Settings,
  Globe,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/translate', label: 'Translate', icon: Languages },
  { href: '/dashboard/languages', label: 'Languages', icon: Globe },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const plan = (session?.user?.plan as string) ?? 'free';

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
          <Languages className="h-4 w-4" />
        </span>
        <span className="font-semibold">Linguava</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1" aria-label="Dashboard navigation">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Plan</span>
          <Badge variant="secondary" className="capitalize">{plan}</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
