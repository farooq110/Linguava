// src/lib/auth/auth-provider.ts
// Abstraction over the auth backend.
// NextAuth.js is the default impl in `./options.ts`. To swap to Clerk/Auth0/Supabase,
// implement this interface and change `getAuthProvider()` in `./config.ts`.

import type { NextAuthOptions } from 'next-auth';

export interface AuthProviderConfig {
  /** NextAuth options used by the route handler. */
  nextAuthOptions: NextAuthOptions;
  /** Display name shown in admin UI. */
  name: string;
  /** Whether Google OAuth is enabled. */
  googleEnabled: boolean;
}
