import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

const VALID = new Set(['going', 'interested', 'not_going']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { status } = await req.json().catch(() => ({}));
  if (!VALID.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  const eventId = Number(params.id);
  await prisma.eventRsvp.upsert({
    where: { event_id_user_id: { event_id: eventId, user_id: me.id } },
    update: { status },
    create: { event_id: eventId, user_id: me.id, status },
  });
  const count = await prisma.eventRsvp.count({ where: { event_id: eventId } });
  return NextResponse.json({ my_rsvp: status, count });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.eventRsvp.deleteMany({ where: { event_id: Number(params.id), user_id: me.id } });
  return NextResponse.json({ my_rsvp: null });
}
