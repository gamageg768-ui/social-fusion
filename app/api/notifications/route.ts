import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET() {
  const prisma = await ensureDb();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  if (!me) return NextResponse.json([]);

  const notifs = await prisma.notification.findMany({
    where: { user_id: me.id },
    include: { actor: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(notifs.map(n => ({
    ...n,
    created_at: n.created_at.toISOString(),
    actor: { ...n.actor, created_at: n.actor.created_at.toISOString() },
  })));
}
