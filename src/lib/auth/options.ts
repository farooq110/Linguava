// src/lib/auth/options.ts
// NextAuth.js options: Credentials + (optional) Google providers.
// Session strategy is JWT (no DB sessions needed for SQLite-friendly deploys).
// Adapters are NOT used so we have full control over user creation.

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/utils';

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const authOptions: NextAuthOptions = {
  // JWT strategy — no extra DB writes per request.
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/sign-in',
    error: '/sign-in/error',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? '';
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth: upsert user on first login.
      if (account?.provider === 'google' && user?.email) {
        const email = user.email.toLowerCase();
        const existing = await db.user.findUnique({ where: { email } });
        if (!existing) {
          await db.user.create({
            data: {
              email,
              name: user.name ?? null,
              image: user.image ?? null,
              provider: 'google',
              emailVerified: new Date(),
            },
          });
        } else if (existing.provider !== 'google' && !existing.passwordHash) {
          // Link account if it was created without credentials.
          await db.user.update({
            where: { id: existing.id },
            data: { provider: 'google', image: user.image ?? existing.image },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        // Refresh plan/preferredLang/model settings on every login (cheap DB read).
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            plan: true,
            preferredLang: true,
            role: true,
            name: true,
            defaultSourceLang: true,
            defaultTargetLang: true,
            translationModel: true,
            voiceModel: true,
          },
        });
        if (dbUser) {
          token.plan = dbUser.plan;
          token.preferredLang = dbUser.preferredLang;
          token.role = dbUser.role;
          token.name = dbUser.name ?? token.name;
          token.defaultSourceLang = dbUser.defaultSourceLang;
          token.defaultTargetLang = dbUser.defaultTargetLang;
          token.translationModel = dbUser.translationModel;
          token.voiceModel = dbUser.voiceModel;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).plan = token.plan ?? 'free';
        (session.user as any).preferredLang = token.preferredLang ?? 'en';
        (session.user as any).role = token.role ?? 'user';
        (session.user as any).defaultSourceLang = token.defaultSourceLang ?? 'ur';
        (session.user as any).defaultTargetLang = token.defaultTargetLang ?? 'en';
        (session.user as any).translationModel = token.translationModel ?? 'glm-4-flash';
        (session.user as any).voiceModel = token.voiceModel ?? 'web-speech';
      }
      return session;
    },
  },
};
