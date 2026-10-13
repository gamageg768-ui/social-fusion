import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const msgId = Number(params.id);
  const { content } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  const msg = await prisma.message.findUnique({ where: { id: msgId } });
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (msg.sender_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (msg.message_type !== 'text') return NextResponse.json({ error: 'Only text messages can be edited' }, { status: 400 });

  const updated = await prisma.message.update({
    where: { id: msgId },
    data: { content: content.trim(), is_edited: true, edited_at: new Date() },
    include: { sender: true, reactions: true, reply_to: { include: { sender: true } } },
  });

  return NextResponse.json({
    ...updated,
    created_at: updated.created_at.toISOString(),
    delivered_at: updated.delivered_at?.toISOString() ?? null,
    edited_at: updated.edited_at?.toISOString() ?? null,
    sender: { ...updated.sender, created_at: updated.sender.created_at.toISOString(), last_seen: updated.sender.last_seen?.toISOString() ?? null },
    reply_to: updated.reply_to ? {
      ...updated.reply_to,
      created_at: updated.reply_to.created_at.toISOString(),
      delivered_at: updated.reply_to.delivered_at?.toISOString() ?? null,
      sender: { ...updated.reply_to.sender, created_at: updated.reply_to.sender.created_at.toISOString(), last_seen: updated.reply_to.sender.last_seen?.toISOString() ?? null },
    } : null,
  });
}
