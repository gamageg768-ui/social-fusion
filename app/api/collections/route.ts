import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const collections = await prisma.collection.findMany({
    where: { user_id: me.id },
    include: { _count: { select: { posts: true } } },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(collections.map(c => ({
    id: c.id, user_id: c.user_id, name: c.name,
    created_at: c.created_at.toISOString(), _count: c._count,
  })));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const col = await prisma.collection.create({
    data: { user_id: me.id, name: name.trim() },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    id: col.id, user_id: col.user_id, name: col.name,
    created_at: col.created_at.toISOString(), _count: col._count,
  }, { status: 201 });
}
