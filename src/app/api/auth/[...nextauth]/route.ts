// src/app/api/auth/[...nextauth]/route.ts
// NextAuth route handler. Delegates to swappable options in `@/lib/auth/config`.

import NextAuth from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';

const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };
