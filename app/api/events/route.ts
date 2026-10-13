import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

function serEvent(e: any, meId: number) {
  const myRsvp = e.rsvps?.find((r: any) => r.user_id === meId)?.status ?? null;
  return {
    id: e.id, user_id: e.user_id, title: e.title, description: e.description,
    cover_url: e.cover_url, location: e.location,
    starts_at: e.starts_at.toISOString(),
    ends_at: e.ends_at?.toISOString() ?? null,
    created_at: e.created_at.toISOString(),
    user: { ...e.user, created_at: e.user.created_at.toISOString(), last_seen: e.user.last_seen?.toISOString() ?? null },
    my_rsvp: myRsvp,
    _count: e._count,
  };
}

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const events = await prisma.event.findMany({
    include: { user: true, rsvps: true, _count: { select: { rsvps: true } } },
    orderBy: { starts_at: 'asc' },
    take: 30,
  });
  return NextResponse.json(events.map(e => serEvent(e, meId)));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await req.json().catch(() => ({}));
  if (!data.title?.trim() || !data.starts_at) return NextResponse.json({ error: 'title and starts_at required' }, { status: 400 });
  const event = await prisma.event.create({
    data: {
      user_id: me.id, title: data.title.trim(), description: data.description ?? '',
      cover_url: data.cover_url ?? '', location: data.location ?? '',
      starts_at: new Date(data.starts_at),
      ends_at: data.ends_at ? new Date(data.ends_at) : null,
    },
    include: { user: true, rsvps: true, _count: { select: { rsvps: true } } },
  });
  return NextResponse.json(serEvent(event, me.id), { status: 201 });
}
