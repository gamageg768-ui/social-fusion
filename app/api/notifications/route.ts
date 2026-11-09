import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const notifs = await prisma.notification.findMany({
    where: { user_id: me.id },
    include: { actor: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(notifs.map(n => ({
    ...n,
    created_at: n.created_at.toISOString(),
    actor: serializeUser(n.actor),
  })));
}
