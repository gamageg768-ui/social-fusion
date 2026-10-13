import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

function serCom(c: any, meId: number) {
  const membership = c.members?.find((m: any) => m.user_id === meId);
  return {
    id: c.id, owner_id: c.owner_id, name: c.name, description: c.description,
    avatar_url: c.avatar_url, is_private: c.is_private,
    created_at: c.created_at.toISOString(),
    owner: c.owner ? { ...c.owner, created_at: c.owner.created_at.toISOString(), last_seen: c.owner.last_seen?.toISOString() ?? null } : undefined,
    is_member: !!membership,
    my_role: membership?.role ?? null,
    _count: c._count,
  };
}

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const communities = await prisma.community.findMany({
    include: { owner: true, members: true, _count: { select: { members: true, posts: true } } },
    orderBy: { created_at: 'desc' },
    take: 30,
  });
  return NextResponse.json(communities.map(c => serCom(c, meId)));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await req.json().catch(() => ({}));
  if (!data.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const com = await prisma.community.create({
    data: { owner_id: me.id, name: data.name.trim(), description: data.description ?? '', avatar_url: data.avatar_url ?? '', is_private: data.is_private ?? false },
    include: { owner: true, members: true, _count: { select: { members: true, posts: true } } },
  });
  await prisma.communityMember.create({ data: { community_id: com.id, user_id: me.id, role: 'admin' } });
  return NextResponse.json(serCom(com, me.id), { status: 201 });
}
