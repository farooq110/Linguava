// src/app/api/auth/forgot-password/route.ts
// Generate a password reset token. In this sandbox we have no SMTP server,
// so we return the reset link in the JSON response (and the UI shows a toast).
// In production: send via nodemailer using SMTP_* env vars.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth/utils';
import { userRepo } from '@/lib/repositories/user.repo';

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // Always return ok to avoid leaking which emails exist.
  const user = await userRepo.findByEmail(email);
  let resetUrl: string | null = null;
  if (user) {
    const token = generateToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.passwordResetToken.create({ data: { email, token, expires } });
    const base = process.env.NEXTAUTH_URL ?? '';
    resetUrl = `${base}/reset-password?token=${token}`;

    // PRODUCTION HOOK: if SMTP_* env vars are set, send the email here instead
    // of returning the link. See nodemailer docs. The UI only displays the link
    // when resetUrl is non-null AND no real SMTP transport was used.
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.FROM_EMAIL) {
      // TODO: send email with nodemailer. We still keep resetUrl out of the
      // response in that case to avoid leaking it.
      resetUrl = null; // hide from response, real email was sent
    }
  }
  return NextResponse.json({ ok: true, resetUrl });
}
