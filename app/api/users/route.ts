import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const q = req.nextUrl.searchParams.get('q') || '';
  const username = req.nextUrl.searchParams.get('username');

  // Exact username lookup for hover cards
  if (username) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return NextResponse.json([]);
    return NextResponse.json([{ ...user, created_at: user.created_at.toISOString() }]);
  }

  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { username: { contains: q } }] } : undefined,
    orderBy: { followers_count: 'desc' },
    take: 20,
  });

  return NextResponse.json(users.map(u => ({ ...u, created_at: u.created_at.toISOString() })));
}
