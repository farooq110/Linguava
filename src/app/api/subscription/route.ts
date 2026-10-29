// src/app/api/subscription/route.ts
// GET current plan, POST upgrade.
//
// Loosely coupled payments:
//   To integrate Stripe (or any provider), define an interface like:
//     interface PaymentProvider {
//       createCheckoutSession(opts: { userId: string; plan: string; successUrl: string; cancelUrl: string }): Promise<{ url: string }>;
//       verifyWebhook(req: Request): Promise<{ userId: string; plan: string }>;
//     }
//   Then call `paymentProvider.createCheckoutSession(...)` here on POST and
//   return `{ url }` so the client redirects. Replace the direct DB write below.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getAuthOptions } from '@/lib/auth/config';
import { userRepo } from '@/lib/repositories/user.repo';
import { PLANS, PlanId } from '@/lib/subscription/plans';

export async function GET() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const user = await userRepo.findById(session.user.id);
  const planId = (user?.plan ?? 'free') as PlanId;
  return NextResponse.json({ plan: planId, planDetails: PLANS[planId] });
}

const upgradeSchema = z.object({ plan: z.enum(['free', 'diamond', 'premium']) });

export async function POST(req: Request) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  let json: any;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = upgradeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  // DEMO: no real payment processor; just update the DB.
  // PRODUCTION: replace this block with a PaymentProvider.createCheckoutSession()
  // call, return the checkout URL, and let the webhook update the DB on success.
  await userRepo.updatePlan(session.user.id, parsed.data.plan);
  return NextResponse.json({ ok: true, plan: parsed.data.plan });
}
