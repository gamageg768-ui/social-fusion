import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const h = await prisma.highlight.findUnique({ where: { id: Number(params.id) } });
  if (!h || h.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.highlight.delete({ where: { id: h.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, cover_url } = await req.json().catch(() => ({}));
  const h = await prisma.highlight.findUnique({ where: { id: Number(params.id) } });
  if (!h || h.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await prisma.highlight.update({ where: { id: h.id }, data: { name: name?.trim() ?? h.name, cover_url: cover_url ?? h.cover_url }, include: { stories: true } });
  return NextResponse.json({ ...updated, created_at: updated.created_at.toISOString() });
}
