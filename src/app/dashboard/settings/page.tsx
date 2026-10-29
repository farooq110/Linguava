// src/app/dashboard/settings/page.tsx
// Profile + language defaults + translation engine + voice engine settings.

import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { Topbar } from '@/components/dashboard/topbar';
import { SettingsForm } from '@/components/dashboard/settings-form';

export default async function SettingsPage() {
  const session = await getServerSession(getAuthOptions());
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold mb-1">Settings</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your profile, default languages, and AI engines.
          </p>
          <SettingsForm
            defaultName={session?.user?.name ?? ''}
            defaultEmail={session?.user?.email ?? ''}
            defaultPreferredLang={(session?.user?.preferredLang as string) ?? 'en'}
            defaultSourceLang={(session?.user?.defaultSourceLang as string) ?? 'ur'}
            defaultTargetLang={(session?.user?.defaultTargetLang as string) ?? 'en'}
            defaultTranslationModel={(session?.user?.translationModel as string) ?? 'glm-4-flash'}
            defaultVoiceModel={(session?.user?.voiceModel as string) ?? 'web-speech'}
          />
        </div>
      </main>
    </>
  );
}
