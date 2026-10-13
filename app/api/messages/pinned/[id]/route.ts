import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

// GET /api/messages/pinned/[id]  (id = partner_id) — get pinned messages in conversation
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ messages: [] });

  const partnerId = Number(params.id);

  const pins = await prisma.messagePin.findMany({
    where: {
      user_id: me.id,
      message: {
        OR: [
          { sender_id: me.id, receiver_id: partnerId },
          { sender_id: partnerId, receiver_id: me.id },
        ],
      },
    },
    include: {
      message: { include: { sender: true, reactions: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 10,
  });

  return NextResponse.json({
    messages: pins.map(p => ({
      ...p.message,
      created_at: p.message.created_at.toISOString(),
      delivered_at: p.message.delivered_at?.toISOString() ?? null,
      sender: { ...p.message.sender, created_at: p.message.sender.created_at.toISOString(), last_seen: p.message.sender.last_seen?.toISOString() ?? null },
      is_pinned: true,
    })),
  });
}
