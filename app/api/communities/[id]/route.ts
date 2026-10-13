import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const c = await prisma.community.findUnique({
    where: { id: Number(params.id) },
    include: { owner: true, members: { include: { user: true } }, _count: { select: { members: true, posts: true } } },
  });
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const membership = c.members.find(m => m.user_id === meId);
  return NextResponse.json({
    id: c.id, owner_id: c.owner_id, name: c.name, description: c.description,
    avatar_url: c.avatar_url, is_private: c.is_private, created_at: c.created_at.toISOString(),
    owner: { ...c.owner, created_at: c.owner.created_at.toISOString(), last_seen: c.owner.last_seen?.toISOString() ?? null },
    is_member: !!membership, my_role: membership?.role ?? null, _count: c._count,
    members: c.members.map(m => ({ ...m, created_at: m.created_at.toISOString(), user: { ...m.user, created_at: m.user.created_at.toISOString(), last_seen: m.user.last_seen?.toISOString() ?? null } })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const c = await prisma.community.findUnique({ where: { id: Number(params.id) } });
  if (!c || c.owner_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await prisma.community.delete({ where: { id: c.id } });
  return NextResponse.json({ ok: true });
}
