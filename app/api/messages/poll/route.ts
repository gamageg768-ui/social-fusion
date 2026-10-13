import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { receiver_id, question, options } = await req.json();
  if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: 'Invalid poll data' }, { status: 400 });
  }

  const poll = await prisma.poll.create({
    data: { question: question.trim(), options: JSON.stringify(options.map((o: string) => o.trim()).filter(Boolean)) },
  });

  const msg = await prisma.message.create({
    data: {
      sender_id: me.id,
      receiver_id: Number(receiver_id),
      content: question.trim(),
      message_type: 'poll',
      image_url: '',
      is_read: false,
      poll_id: poll.id,
    },
    include: {
      sender: true,
      reactions: true,
      reply_to: { include: { sender: true } },
      poll: { include: { votes: true } },
    },
  });

  return NextResponse.json({
    ...msg,
    created_at: msg.created_at.toISOString(),
    delivered_at: msg.delivered_at?.toISOString() ?? null,
    edited_at: msg.edited_at?.toISOString() ?? null,
    scheduled_at: msg.scheduled_at?.toISOString() ?? null,
    sender: { ...msg.sender, created_at: msg.sender.created_at.toISOString(), last_seen: msg.sender.last_seen?.toISOString() ?? null },
    reply_to: null,
  }, { status: 201 });
}
