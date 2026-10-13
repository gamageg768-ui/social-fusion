import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const col = await prisma.collection.findUnique({ where: { id: Number(params.id) } });
  if (!col || col.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.collection.delete({ where: { id: col.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json().catch(() => ({}));
  const col = await prisma.collection.findUnique({ where: { id: Number(params.id) } });
  if (!col || col.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.collection.update({
    where: { id: col.id }, data: { name: name?.trim() || col.name },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({ id: updated.id, name: updated.name, created_at: updated.created_at.toISOString(), _count: updated._count });
}
