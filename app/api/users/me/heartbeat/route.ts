import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false });
  await prisma.user.update({ where: { id: me.id }, data: { last_seen: new Date() } });
  return NextResponse.json({ ok: true });
}
