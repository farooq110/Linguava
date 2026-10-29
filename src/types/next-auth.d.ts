// src/types/next-auth.d.ts
// Extends NextAuth session/JWT types with our custom user fields.

import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      plan: string;
      preferredLang: string;
      role: string;
    } & DefaultSession['user'];
  }
  interface User extends DefaultUser {
    plan?: string;
    preferredLang?: string;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    plan?: string;
    preferredLang?: string;
    role?: string;
  }
}
