import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function POST() {
  const prisma = await ensureDb();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  if (!me) return NextResponse.json({ ok: false });

  await prisma.notification.updateMany({
    where: { user_id: me.id },
    data: { is_read: true },
  });

  return NextResponse.json({ ok: true });
}
