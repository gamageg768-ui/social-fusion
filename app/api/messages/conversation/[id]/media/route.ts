import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

// GET /api/messages/conversation/[id]/media — all media shared in conversation
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const partnerId = Number(params.id);

  const messages = await prisma.message.findMany({
    where: {
      message_type: { in: ['image', 'gif', 'audio'] },
      OR: [
        { sender_id: me.id, receiver_id: partnerId },
        { sender_id: partnerId, receiver_id: me.id },
      ],
    },
    include: { sender: true },
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  return NextResponse.json(messages.map(m => ({
    ...m,
    created_at: m.created_at.toISOString(),
    delivered_at: m.delivered_at?.toISOString() ?? null,
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
  })));
}
