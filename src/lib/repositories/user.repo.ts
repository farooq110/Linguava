// src/lib/repositories/user.repo.ts
// All User CRUD goes through here. Swap DB by replacing these functions only.

import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/utils';

export const userRepo = {
  findByEmail(email: string) {
    return db.user.findUnique({ where: { email: email.toLowerCase() } });
  },
  findById(id: string) {
    return db.user.findUnique({ where: { id } });
  },
  async create(input: {
    email: string;
    name?: string;
    password: string;
    provider?: string;
    preferredLang?: string;
  }) {
    const passwordHash = await hashPassword(input.password);
    return db.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name ?? null,
        passwordHash,
        provider: input.provider ?? 'credentials',
        preferredLang: input.preferredLang ?? 'en',
      },
    });
  },
  updatePlan(userId: string, plan: string) {
    return db.user.update({ where: { id: userId }, data: { plan } });
  },
  updateProfile(userId: string, data: {
    name?: string;
    preferredLang?: string;
    image?: string | null;
    defaultSourceLang?: string;
    defaultTargetLang?: string;
    translationModel?: string;
    voiceModel?: string;
  }) {
    return db.user.update({ where: { id: userId }, data });
  },
  updatePassword(userId: string, newPlainPassword: string) {
    return hashPassword(newPlainPassword).then((passwordHash) =>
      db.user.update({ where: { id: userId }, data: { passwordHash } }),
    );
  },
};
