import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

// POST /api/messages/[id]/pin — toggle pin
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const messageId = Number(params.id);

  const existing = await prisma.messagePin.findUnique({
    where: { message_id_user_id: { message_id: messageId, user_id: me.id } },
  });

  if (existing) {
    await prisma.messagePin.delete({ where: { id: existing.id } });
    return NextResponse.json({ pinned: false });
  }

  await prisma.messagePin.create({ data: { message_id: messageId, user_id: me.id } });
  return NextResponse.json({ pinned: true });
}
