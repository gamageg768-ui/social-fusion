import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

function serCh(c: any, meId: number) {
  return {
    id: c.id, owner_id: c.owner_id, name: c.name, description: c.description, avatar_url: c.avatar_url,
    created_at: c.created_at.toISOString(),
    owner: c.owner ? { ...c.owner, created_at: c.owner.created_at.toISOString(), last_seen: c.owner.last_seen?.toISOString() ?? null } : undefined,
    is_subscribed: c.subscriptions?.some((s: any) => s.user_id === meId) ?? false,
    _count: c._count,
  };
}

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const channels = await prisma.channel.findMany({
    include: { owner: true, subscriptions: true, _count: { select: { subscriptions: true, posts: true } } },
    orderBy: { created_at: 'desc' },
    take: 30,
  });
  return NextResponse.json(channels.map(c => serCh(c, meId)));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await req.json().catch(() => ({}));
  if (!data.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const ch = await prisma.channel.create({
    data: { owner_id: me.id, name: data.name.trim(), description: data.description ?? '', avatar_url: data.avatar_url ?? '' },
    include: { owner: true, subscriptions: true, _count: { select: { subscriptions: true, posts: true } } },
  });
  return NextResponse.json(serCh(ch, me.id), { status: 201 });
}
