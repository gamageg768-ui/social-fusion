import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

// POST /api/messages/[id]/star — toggle star
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const messageId = Number(params.id);

  const existing = await prisma.messageStar.findUnique({
    where: { message_id_user_id: { message_id: messageId, user_id: me.id } },
  });

  if (existing) {
    await prisma.messageStar.delete({ where: { id: existing.id } });
    return NextResponse.json({ starred: false });
  }

  await prisma.messageStar.create({ data: { message_id: messageId, user_id: me.id } });
  return NextResponse.json({ starred: true });
}
