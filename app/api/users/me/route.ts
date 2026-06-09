import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET() {
  const prisma = await ensureDb();
  const user = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ...user, created_at: user.created_at.toISOString() });
}
