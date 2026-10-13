import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

function serMsg(m: any) {
  return {
    ...m,
    created_at: m.created_at.toISOString(),
    delivered_at: m.delivered_at?.toISOString() ?? null,
    edited_at: m.edited_at?.toISOString() ?? null,
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
    reply_to: m.reply_to ? {
      ...m.reply_to,
      created_at: m.reply_to.created_at.toISOString(),
      delivered_at: m.reply_to.delivered_at?.toISOString() ?? null,
      sender: { ...m.reply_to.sender, created_at: m.reply_to.sender.created_at.toISOString(), last_seen: m.reply_to.sender.last_seen?.toISOString() ?? null },
    } : null,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const partnerId = Number(params.id);
  const beforeId = req.nextUrl.searchParams.get('before_id');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '100'), 100);

  const [messages, myStars, myPins] = await Promise.all([
    prisma.message.findMany({
      where: {
        ...(beforeId ? { id: { lt: Number(beforeId) } } : {}),
        OR: [
          { sender_id: me.id, receiver_id: partnerId },
          { sender_id: partnerId, receiver_id: me.id },
        ],
      },
      include: {
        sender: true,
        reactions: true,
        reply_to: { include: { sender: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    }),
    prisma.messageStar.findMany({ where: { user_id: me.id }, select: { message_id: true } }),
    prisma.messagePin.findMany({ where: { user_id: me.id }, select: { message_id: true } }),
  ]);

  const ordered = [...messages].reverse();

  // Mark received messages as delivered
  const undelivered = ordered.filter(m => m.receiver_id === me.id && !m.delivered_at);
  if (undelivered.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: undelivered.map(m => m.id) } },
      data: { delivered_at: new Date() },
    });
  }

  const starSet = new Set(myStars.map(s => s.message_id));
  const pinSet = new Set(myPins.map(p => p.message_id));

  return NextResponse.json({
    messages: ordered.map(m => ({
      ...serMsg(m),
      is_starred: starSet.has(m.id),
      is_pinned: pinSet.has(m.id),
    })),
    has_more: messages.length === limit,
  });
}
