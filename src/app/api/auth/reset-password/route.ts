// src/app/api/auth/reset-password/route.ts
// Verify token, update passwordHash, mark token used.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { userRepo } from '@/lib/repositories/user.repo';

const bodySchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: Request) {
  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const { token, password } = parsed.data;

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expires.getTime() < Date.now()) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const user = await userRepo.findByEmail(record.email);
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  await userRepo.updatePassword(user.id, password);
  await db.passwordResetToken.update({ where: { id: record.id }, data: { used: true } });
  return NextResponse.json({ ok: true });
}
