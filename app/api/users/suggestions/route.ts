import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET() {
  const prisma = await ensureDb();
  const users = await prisma.user.findMany({
    orderBy: { followers_count: 'desc' },
    take: 8,
  });

  return NextResponse.json(users.map(u => ({ ...u, created_at: u.created_at.toISOString() })));
}
