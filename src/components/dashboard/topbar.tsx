// src/components/dashboard/topbar.tsx
// Top bar: mobile sidebar trigger + page title + theme toggle + user avatar.

'use client';

import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sidebar } from '@/components/dashboard/sidebar';

export function Topbar({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? 'User';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 backdrop-blur px-4 py-3">
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>
      </div>
      <h1 className="flex-1 text-base font-semibold truncate">{title}</h1>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="h-4 w-4 dark:hidden" />
        <Moon className="h-4 w-4 hidden dark:block" />
      </Button>
      <Avatar className="h-8 w-8">
        <AvatarImage src={session?.user?.image ?? undefined} alt={name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    </header>
  );
}
