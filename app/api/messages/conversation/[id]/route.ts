import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  if (!me) return NextResponse.json([]);

  const partnerId = Number(params.id);
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { sender_id: me.id, receiver_id: partnerId },
        { sender_id: partnerId, receiver_id: me.id },
      ],
    },
    include: { sender: true },
    orderBy: { created_at: 'asc' },
  });

  return NextResponse.json(messages.map(m => ({
    ...m,
    created_at: m.created_at.toISOString(),
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString() },
  })));
}
