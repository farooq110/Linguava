// src/app/api/auth/register/route.ts
// Register a new credentials user. Auto-sign-in is handled client-side
// (the sign-in form calls `signIn('credentials', ...)` after success).

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { userRepo } from '@/lib/repositories/user.repo';

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
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
  const { email, name, password } = parsed.data;

  const existing = await userRepo.findByEmail(email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const user = await userRepo.create({ email, name, password, provider: 'credentials' });
  return NextResponse.json({ ok: true, userId: user.id, email: user.email });
}
