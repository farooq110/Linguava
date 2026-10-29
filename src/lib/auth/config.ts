// src/lib/auth/config.ts
// Swappable auth config. Edit this file (and `./options.ts`) to change auth backend.

import { authOptions } from '@/lib/auth/options';

export function getAuthOptions() {
  return authOptions;
}

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
