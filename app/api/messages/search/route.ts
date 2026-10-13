import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json([]);

  const messages = await prisma.message.findMany({
    where: {
      content: { contains: q },
      message_type: { not: 'deleted' },
      OR: [{ sender_id: me.id }, { receiver_id: me.id }],
    },
    include: { sender: true, receiver: true },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return NextResponse.json(messages.map(m => ({
    ...m,
    created_at: m.created_at.toISOString(),
    delivered_at: m.delivered_at?.toISOString() ?? null,
    edited_at: m.edited_at?.toISOString() ?? null,
    scheduled_at: m.scheduled_at?.toISOString() ?? null,
    partner: m.sender_id === me.id
      ? { ...m.receiver, created_at: m.receiver.created_at.toISOString(), last_seen: m.receiver.last_seen?.toISOString() ?? null }
      : { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
    receiver: { ...m.receiver, created_at: m.receiver.created_at.toISOString(), last_seen: m.receiver.last_seen?.toISOString() ?? null },
  })));
}
