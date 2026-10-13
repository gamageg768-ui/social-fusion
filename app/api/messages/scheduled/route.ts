import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const msgs = await prisma.message.findMany({
    where: {
      sender_id: me.id,
      scheduled_at: { not: null },
    },
    include: { sender: true, reactions: true, reply_to: { include: { sender: true } } },
    orderBy: { scheduled_at: 'asc' },
  });

  return NextResponse.json(msgs.map(m => ({
    ...m,
    created_at: m.created_at.toISOString(),
    scheduled_at: m.scheduled_at?.toISOString() ?? null,
    delivered_at: m.delivered_at?.toISOString() ?? null,
    edited_at: m.edited_at?.toISOString() ?? null,
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
    reply_to: null,
  })));
}
