import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const messageId = Number(params.id);
  const { emoji } = await req.json();

  const existing = await prisma.messageReaction.findUnique({
    where: { message_id_user_id: { message_id: messageId, user_id: me.id } },
  });

  if (existing) {
    if (existing.emoji === emoji) {
      // Same emoji — toggle off
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      // Different emoji — update
      await prisma.messageReaction.update({ where: { id: existing.id }, data: { emoji } });
    }
  } else {
    await prisma.messageReaction.create({ data: { message_id: messageId, user_id: me.id, emoji } });
  }

  const reactions = await prisma.messageReaction.findMany({ where: { message_id: messageId } });
  return NextResponse.json({ reactions });
}
