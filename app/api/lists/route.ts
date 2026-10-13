import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const lists = await prisma.userList.findMany({
    where: { user_id: me.id },
    include: { _count: { select: { members: true } } },
    orderBy: [{ is_close_friends: 'desc' }, { created_at: 'asc' }],
  });

  return NextResponse.json(
    lists.map(l => ({ ...l, created_at: l.created_at.toISOString() }))
  );
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { name, is_close_friends } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const list = await prisma.userList.create({
    data: { user_id: me.id, name: name.trim(), is_close_friends: !!is_close_friends },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json({ ...list, created_at: list.created_at.toISOString() }, { status: 201 });
}
