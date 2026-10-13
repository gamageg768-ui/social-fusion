import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const ch = await prisma.channel.findUnique({
    where: { id: Number(params.id) },
    include: { owner: true, subscriptions: true, _count: { select: { subscriptions: true, posts: true } } },
  });
  if (!ch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    id: ch.id, owner_id: ch.owner_id, name: ch.name, description: ch.description, avatar_url: ch.avatar_url,
    created_at: ch.created_at.toISOString(),
    owner: { ...ch.owner, created_at: ch.owner.created_at.toISOString(), last_seen: ch.owner.last_seen?.toISOString() ?? null },
    is_subscribed: ch.subscriptions.some(s => s.user_id === meId),
    _count: ch._count,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ch = await prisma.channel.findUnique({ where: { id: Number(params.id) } });
  if (!ch || ch.owner_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.channel.delete({ where: { id: ch.id } });
  return NextResponse.json({ ok: true });
}
