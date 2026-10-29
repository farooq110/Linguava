// src/app/api/history/[id]/route.ts
// DELETE a single chat history entry owned by the current user.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth/config';
import { historyRepo } from '@/lib/repositories/history.repo';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { id } = await ctx.params;
  await historyRepo.delete(id, session.user.id);
  return NextResponse.json({ ok: true });
}
