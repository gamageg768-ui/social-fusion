import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { receiver_id, content, message_type, image_url, reply_to_id, is_forwarded, scheduled_at } = await req.json();

  const scheduledDate = scheduled_at ? new Date(scheduled_at) : null;
  const isScheduled = scheduledDate && scheduledDate > new Date();

  const msg = await prisma.message.create({
    data: {
      sender_id: me.id,
      receiver_id: Number(receiver_id),
      content: content || '',
      message_type: message_type || 'text',
      image_url: image_url || '',
      reply_to_id: reply_to_id ? Number(reply_to_id) : null,
      is_forwarded: !!is_forwarded,
      is_read: false,
      scheduled_at: isScheduled ? scheduledDate : null,
    },
    include: {
      sender: true,
      reactions: true,
      reply_to: { include: { sender: true } },
    },
  });

  const serialize = (m: typeof msg) => ({
    ...m,
    is_forwarded: m.is_forwarded,
    delivered_at: m.delivered_at?.toISOString() ?? null,
    scheduled_at: m.scheduled_at?.toISOString() ?? null,
    edited_at: m.edited_at?.toISOString() ?? null,
    created_at: m.created_at.toISOString(),
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
    reply_to: m.reply_to ? {
      ...m.reply_to,
      created_at: m.reply_to.created_at.toISOString(),
      delivered_at: m.reply_to.delivered_at?.toISOString() ?? null,
      sender: { ...m.reply_to.sender, created_at: m.reply_to.sender.created_at.toISOString(), last_seen: m.reply_to.sender.last_seen?.toISOString() ?? null },
    } : null,
  });

  return NextResponse.json(serialize(msg), { status: 201 });
}
