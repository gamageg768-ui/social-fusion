import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

function serEvent(e: any, meId: number) {
  const myRsvp = e.rsvps?.find((r: any) => r.user_id === meId)?.status ?? null;
  return {
    id: e.id, user_id: e.user_id, title: e.title, description: e.description,
    cover_url: e.cover_url, location: e.location,
    starts_at: e.starts_at.toISOString(), ends_at: e.ends_at?.toISOString() ?? null,
    created_at: e.created_at.toISOString(),
    user: { ...e.user, created_at: e.user.created_at.toISOString(), last_seen: e.user.last_seen?.toISOString() ?? null },
    my_rsvp: myRsvp, _count: e._count,
    rsvps: (e.rsvps ?? []).map((r: any) => ({
      ...r, created_at: r.created_at.toISOString(),
      user: r.user ? { ...r.user, created_at: r.user.created_at.toISOString(), last_seen: r.user.last_seen?.toISOString() ?? null } : undefined,
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const event = await prisma.event.findUnique({
    where: { id: Number(params.id) },
    include: { user: true, rsvps: { include: { user: true } }, _count: { select: { rsvps: true } } },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serEvent(event, meId));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const event = await prisma.event.findUnique({ where: { id: Number(params.id) } });
  if (!event || event.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.event.delete({ where: { id: event.id } });
  return NextResponse.json({ ok: true });
}
